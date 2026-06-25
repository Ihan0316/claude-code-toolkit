# 04. 자동 루틴 — 정해진 시간에 도는 작업

## 개념

`scheduled-tasks`는 OS 스케줄러(Windows 작업 스케줄러 / macOS launchd)가 정해진 시각에 Claude Code를 띄워, 미리 정의한 절차(`SKILL.md`)를 수행하게 하는 자동 루틴입니다.

- 정의: `~/.claude/scheduled-tasks/<task>/SKILL.md` (frontmatter `name`/`description` + 본문 절차)
- 실행: OS 스케줄러가 해당 시각에 트리거
- 원칙: 자동 루틴은 **읽기/분석 위주**. 외부 시스템(시트·노션) 자동 수정은 지양하고 제안만.

---

## 실제로 돌린 루틴들

| 루틴 | 시점 | 무엇 |
|---|---|---|
| **daily-report** | 평일 17:50 | 하루 일과 정리 → 로컬 일일일지 + 노션 일간보고 저장 |
| **weekly-report** | 금 18:00 | 한 주 일일보고 취합 → 노션 주간보고 + 회사 구글시트 기입 |
| **monthly-memory-consolidation** | 매월 첫 금 14:00 | 메모리 중복·진부화 자동 정리(백업 직후) |
| **weekly-backup** | 금 13:00 | `~/.claude/` 설정 zip 백업, 8주 보관 |

> 일회성 루틴(`...-once-날짜`)이나 특정 결과 확인 루틴도 같은 틀로 정의 가능합니다.

---

## 왜 자동화했나

- **보고는 매일/매주 같은 형식** → 사람이 매번 손으로 취합하는 건 낭비. 일일일지를 소스로 자동 종합.
- **일관성** → 프로젝트 표시명·주차 표기·상태 어휘를 규약으로 고정해, 로컬·노션·시트가 항상 같은 말로 적히게.
- **누락 방지** → 백업·메모리 정리처럼 "안 하면 서서히 망가지는" 작업을 스케줄러에 위임.

## 설계 패턴(핵심)

### 1) 경로를 하드코딩하지 않는다

루틴 SKILL.md는 OS 무관하게 동작하도록, cwd 기반으로 워크스페이스 루트·메모리 폴더를 **자동 탐지**합니다. 그래야 Windows·Mac 양쪽에서 같은 정의가 돕니다.

```
워크스페이스 루트 = cwd에서 상위로 올라가며 'workspace' 폴더 탐색
프로젝트 = 워크스페이스 직하위 폴더 중 CLAUDE.md가 있는 폴더
```

→ 새 프로젝트를 보고 대상에 넣으려면 그 폴더에 `CLAUDE.md`만 두면 됩니다(등록 불필요).

### 2) 자동은 읽기, 변경은 제안

24시간 테스트 결과 판정 루틴을 예로 들면: 결과를 읽고 PASS/FAIL을 표로 보고하되, **외부 산출물(구글시트) 갱신은 사용자 확인 후**에만. 자동 루틴이 외부 시스템을 멋대로 바꾸지 않게 한 안전선입니다.

### 3) 일회성 vs 정규

- 정규: 매주/매월 반복
- 일회성: "이번 주만 11시에", "내일 결과만 확인" → 도구로 한 번 쓰고 폐기

---

## 등록 방법

- **간편**: `schedule` 스킬(또는 `/schedule`)로 자연어로 등록 — "매일 아침 9시에 X 해줘".
- **수동**:
  - Windows: 작업 스케줄러(`schtasks`)에 Claude Code 실행 작업 등록
  - macOS: `~/Library/LaunchAgents/com.claude.<name>.plist` 등록

> ⚠️ 작업 스케줄러 등록/삭제는 시스템 변경입니다. 자동화하지 말고 직접 확인하며 등록하세요.

→ 예시 정의: [examples/scheduled-tasks/daily-report/SKILL.md](../examples/scheduled-tasks/daily-report/SKILL.md), [examples/scheduled-tasks/weekly-report/SKILL.md](../examples/scheduled-tasks/weekly-report/SKILL.md)
