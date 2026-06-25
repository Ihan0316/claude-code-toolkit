# 01. 훅(Hooks) — 자동으로 끼어드는 안전장치

## 훅이란?

훅은 Claude Code의 특정 시점(세션 시작, 도구 실행 직전/직후, 사용자 입력 직후 등)에 **자동으로 실행되는 스크립트**입니다. `~/.claude/settings.json` 의 `hooks` 항목에 등록합니다.

이 셋업에서 가장 투자 대비 효과가 큰 부분입니다. "Claude가 알아서 잘하겠지"에 의존하지 않고, **시스템이 강제로** 실수를 막고 맥락을 주입합니다.

### 훅 종류(이벤트)

| 이벤트 | 시점 | 이 셋업에서의 용도 |
|---|---|---|
| `SessionStart` | 세션 시작/재개 | 오늘 보고·메모리·백업 상태를 맥락으로 주입 |
| `UserPromptSubmit` | 사용자가 입력할 때마다 | 모호한 프롬프트 감지 |
| `PreToolUse` | 도구 실행 직전 | 위험 명령 차단, 플랜 모드 가이드 |
| `PostToolUse` | 도구 실행 직후 | 저장된 파일 인코딩 자동 교정 |

---

## 훅 1 — 위험 명령 차단 (`guard-dangerous-bash.ps1`)

**무엇**: `PreToolUse`에서 Bash/PowerShell 명령을 가로채, 비가역·위험 패턴이면 `exit 2`로 실행을 막습니다.

**차단 대상**:
- `rm -rf` / `Remove-Item -Recurse -Force` — 재귀·강제 삭제
- `git push --force` — 원격 히스토리 덮어쓰기
- `git reset --hard`, `git clean -f`, `git branch -D` — 작업물 손실
- `npm/pip uninstall` — 의존성 제거
- `shutdown`, `Stop-Computer` — 시스템 종료

**왜 썼나**: LLM 에이전트는 "정리할게요" 하면서 `rm -rf`를 실제로 실행할 수 있습니다. 한 번 지워지면 끝입니다. 사람의 확인을 **시스템이 강제**하도록 만들었습니다.

**장점**:
- 비가역 사고를 원천 차단 (가장 무서운 실수를 구조적으로 제거)
- 차단 사유를 한국어로 명확히 출력 → Claude가 "사용자 확인이 필요하다"는 걸 인지하고 대안 제시
- 정규식 한 줄로 패턴 추가/완화 가능

→ [examples/hooks/guard-dangerous-bash.ps1](../examples/hooks/guard-dangerous-bash.ps1)

---

## 훅 2 — UTF-8 BOM 자동 교정 (`ensure-utf8-bom.ps1`)

**무엇**: `PostToolUse(Write|Edit)`에서, 방금 저장한 `.ps1` 파일에 BOM이 없으면 UTF-8 BOM을 자동으로 붙입니다.

**왜 썼나**: 한국어 Windows(PowerShell 5.1)는 BOM이 없는 UTF-8 파일을 CP949로 오해석합니다. 한글이 들어간 PowerShell 스크립트가 BOM 없이 저장되면 **콘솔에서 한글이 깨지고 스크립트가 오작동**합니다. 매번 손으로 BOM을 챙기는 건 비현실적이라 저장 시점에 자동화했습니다.

**장점**:
- 한글 Windows 환경의 고질적 인코딩 버그를 저장 즉시 제거
- 대상 확장자/조건을 좁게 한정(`.ps1`만) → 부작용 없음
- BOM이 이미 있으면 건너뜀(멱등)

→ [examples/hooks/ensure-utf8-bom.ps1](../examples/hooks/ensure-utf8-bom.ps1)

---

## 훅 3 — 세션 컨텍스트 주입 (`session-context.ps1`)

**무엇**: `SessionStart`에서 아래 4가지를 3~5줄로 요약해 화면 + Claude 컨텍스트에 주입합니다.

1. 마지막 일일보고가 언제였는지
2. 최근 갱신된 메모리 파일
3. 마지막 설정 백업 시점(8일 넘으면 ⚠️)
4. 다음 자동 백업 예정 시각

**왜 썼나**: 세션을 새로 켤 때마다 "어제 뭐 했더라", "백업은 돌고 있나"를 사람이 확인하는 건 비효율적입니다. 켜는 순간 현재 상태를 한눈에 보여주도록 했습니다. Claude도 이 맥락을 받아 이어서 작업합니다.

**핵심 기법**: 현재 작업 폴더(cwd)를 Claude의 `projects/` 인코딩 규칙(영숫자 외 문자를 `-`로 치환)으로 변환한 뒤, 상위로 거슬러 올라가며 `memory/` 폴더를 자동 탐지합니다. 덕분에 하위 어느 프로젝트에서 켜도 워크스페이스 공용 메모리를 찾아냅니다.

**장점**:
- 세션 시작 즉시 "지금 어디까지 와 있는지" 파악
- 백업 누락을 자동 경고 → 설정 유실 예방
- 경로 하드코딩 없이 어느 머신/프로젝트에서도 동작

→ [examples/hooks/session-context.ps1](../examples/hooks/session-context.ps1)

---

## 훅 4 — 프롬프트 명확성 평가 (`improve-prompt.py`)

**무엇**: `UserPromptSubmit`에서, 사용자가 입력할 때마다 "이 요청이 바로 실행 가능할 만큼 명확한가, 아니면 더 캐물어야 하나"를 평가하는 지시를 컨텍스트에 덧붙입니다.

- `*`로 시작하면 평가 우회(명시적 바이패스)
- `/`(슬래시 명령)·`#`(메모) 으로 시작하면 그대로 통과

**왜 썼나**: 모호한 한 줄("그거 고쳐줘")에 Claude가 추측으로 엉뚱한 작업을 하는 걸 줄이려고. 정말 모호할 때만 `prompt-improver` 스킬로 되묻게 합니다. 기본값은 "신뢰하고 바로 진행"이라 과도한 되물음은 막습니다.

**장점**:
- 모호한 요청 → 잘못된 대량 작업으로 번지는 사고 감소
- 명확한 요청은 그대로 통과(마찰 없음)
- 바이패스 접두사로 사용자가 언제든 끌 수 있음

→ [examples/hooks/improve-prompt.py](../examples/hooks/improve-prompt.py)

---

## 훅 5 — 플랜 모드 가독성 가이드 (`plan-guidance.py`)

**무엇**: `PreToolUse(EnterPlanMode)`에서, 계획을 작성할 때의 가독성 규칙을 주입합니다. "거절한 대안·수정 이력은 빼고, 한 스텝에 한 동작, 파일 경로를 앵커로(`src/auth.ts:42`), 설명보다 간결한 동작 위주로."

**왜 썼나**: 계획이 길어지면 "왜 이걸 안 했는지" 같은 메타 서술로 지저분해집니다. 읽기 좋은 실행 계획만 남도록 형식을 강제했습니다.

**장점**: 매번 같은 품질의 깔끔한 실행 계획. 계획 수정 시 이력 누적 없이 통째로 새로 쓰게 유도.

→ [examples/hooks/plan-guidance.py](../examples/hooks/plan-guidance.py)

---

## 등록 방법

`~/.claude/settings.json` 의 `hooks`에 이벤트별로 등록합니다. 전체 예시는 [examples/settings.json](../examples/settings.json) 참고.

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [{
          "type": "command",
          "command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"<훅경로>\\guard-dangerous-bash.ps1\"",
          "shell": "powershell",
          "timeout": 5
        }]
      }
    ]
  }
}
```

### 훅 작성 핵심 규칙

- 훅은 stdin으로 JSON(도구명·인자 등)을 받습니다. 첫 줄에서 읽고 파싱하세요.
- **차단하려면 `exit 2`** + stderr에 사유 출력. `exit 0`은 통과.
- 컨텍스트를 주입하려면 `hookSpecificOutput.additionalContext` JSON을 stdout에 출력.
- 절대 느려선 안 됩니다(매 도구 호출마다 실행). `timeout`을 짧게.
