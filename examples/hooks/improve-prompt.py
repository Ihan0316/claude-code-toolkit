#!/usr/bin/env python3
"""improve-prompt (lean)

원본 대비 변경:
  - 판정을 모델이 아니라 이 스크립트가 한다 -> 대부분의 턴에서 '무출력'(토큰 0).
  - 사용자 프롬프트를 additionalContext 로 되풀이하지 않는다(원본은 전문 재복사 = 입력 2배).
  - 잔소리 멘트("Hey! The Prompt Improver Hook flagged...") 강제 제거.
  - prompt-improver 스킬 의존 제거. 모호하면 그냥 한 가지만 되묻게 한다.

발화 조건(전부 만족할 때만 1줄 주입):
  1) 세션의 사실상 첫 요청 (대화 중 짧은 답/후속은 맥락이 있으므로 제외)
  2) 짧다
  3) 구체 신호(경로/확장자/코드/에러/숫자/따옴표 등)가 없다

등록: settings.json > hooks > UserPromptSubmit
"""
import io
import json
import os
import re
import sys

sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# 임계값 (조정 지점)
MAX_CHARS_FOR_VAGUE = 28      # 이보다 길면 모호로 보지 않음
MAX_TRANSCRIPT_TURNS = 1      # 이보다 대화가 진행됐으면 발화 안 함

HINT = (
    "[hint] 첫 요청이 짧고 대상이 불명확합니다. "
    "맥락·코드에서 대상을 특정할 수 없으면 실행 전에 한 가지만 확인하세요."
)

# 구체성 신호: 하나라도 있으면 모호하지 않다고 본다
SPECIFIC_PAT = re.compile(
    r"""(
        [/\\]                 # 경로 구분자
      | \.\w{1,5}\b           # 확장자 (.py .md .json ...)
      | \(\)                  # 함수 호출
      | [`'"]                 # 인용/코드 표시
      | \d                    # 숫자
      | https?://             # URL
      | [A-Za-z_]\w*_\w+      # snake_case 식별자
      | \b[A-Z]{2,}\b         # 약어/상수 (NPU, KPI ...)
    )""",
    re.VERBOSE,
)


def read_input():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def already_in_conversation(transcript_path):
    """대화가 이미 진행 중이면 True. 판단 불가면 False(=보수적으로 검사 진행)."""
    if not transcript_path:
        return False
    try:
        if not os.path.exists(transcript_path):
            return False
        turns = 0
        with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                # 실제 transcript 는 "type":"assistant" / "role":"assistant" 둘 다 쓴다
                if '"assistant"' in line:
                    turns += 1
                    if turns > MAX_TRANSCRIPT_TURNS:
                        return True
        return turns > MAX_TRANSCRIPT_TURNS
    except Exception:
        return False


def main():
    data = read_input()
    prompt = (data.get("prompt") or "").strip()

    # bypass: 명시적 skip(*), 슬래시 커맨드, 메모라이즈(#) -> 무출력
    if not prompt or prompt[0] in "*/#":
        return

    # 대화 중이면 짧은 답도 맥락이 있다 -> 무출력
    if already_in_conversation(data.get("transcript_path")):
        return

    # 길면 모호하지 않다고 본다
    if len(prompt) > MAX_CHARS_FOR_VAGUE:
        return

    # 구체 신호가 있으면 통과
    if SPECIFIC_PAT.search(prompt):
        return

    # 여기까지 왔으면: 첫 요청 + 짧음 + 구체 신호 없음
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": HINT,
        }
    }))


if __name__ == "__main__":
    main()
