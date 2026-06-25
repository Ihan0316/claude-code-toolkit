#!/usr/bin/env python3
"""
UserPromptSubmit 훅 — 프롬프트 명확성 평가
사용자 입력마다 "바로 실행 가능한가, 더 캐물어야 하나"를 평가하는 지시를 컨텍스트에 덧붙인다.
- '*' 접두사: 평가 우회(명시적 바이패스)
- '/'(슬래시 명령), '#'(메모): 그대로 통과
등록: settings.json > hooks > UserPromptSubmit
"""
import json
import sys
import io

sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

prompt = input_data.get("prompt", "")


def output_json(text):
    """UserPromptSubmit JSON 포맷으로 컨텍스트 주입"""
    output = {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": text
        }
    }
    print(json.dumps(output))


# 바이패스 조건
if prompt.startswith("*"):
    # 명시적 우회 — '*' 제거 후 그대로
    output_json(prompt[1:].strip())
    sys.exit(0)

if prompt.startswith("/"):
    # 슬래시 명령 — 통과
    output_json(prompt)
    sys.exit(0)

if prompt.startswith("#"):
    # 메모 기능 — 통과
    output_json(prompt)
    sys.exit(0)

wrapped_prompt = f"""PROMPT EVALUATION

Original user request: "{prompt}"

EVALUATE: Is this prompt clear enough to execute, or does it need enrichment?

PROCEED IMMEDIATELY if:
- Detailed/specific OR you have sufficient context OR can infer intent

ONLY USE SKILL if genuinely vague (e.g., "fix the bug" with no context):
- If vague:
  1. First, preface with brief note: "Hey! The Prompt Improver Hook flagged your prompt as a bit vague because [specific reason]."
  2. Then use the prompt-improver skill to research and generate clarifying questions
- Trust user intent by default. Check conversation history before using the skill.

If clear, proceed with the original request. If vague, invoke the skill."""

output_json(wrapped_prompt)
sys.exit(0)
