# 00. 빠른 시작

Claude Code를 처음 깔았거나, 이 툴킷을 자기 환경에 옮기려는 사람을 위한 최소 경로입니다.

## 0) 전제

- [Claude Code](https://claude.ai/code) 설치 완료
- 글로벌 설정 폴더 위치
  - Windows: `%USERPROFILE%\.claude\` (예: `C:\Users\<USER>\.claude\`)
  - macOS/Linux: `~/.claude/`

## 1) 가장 먼저 — 글로벌 지침(CLAUDE.md)

`~/.claude/CLAUDE.md` 에 "나는 누구이고, 어떻게 답해줬으면 좋겠는지"를 적습니다. 모든 세션에 자동으로 주입되는 시스템 프롬프트입니다.

→ [examples/CLAUDE.md.example](../examples/CLAUDE.md.example) 복사 후 본인에 맞게 수정.

**효과**: 매 대화마다 "한국어로 답해줘", "내 환경은 Windows야"를 반복할 필요가 없어집니다.

## 2) 훅 1개만 먼저 — 위험 명령 차단

가장 체감 큰 훅부터. `rm -rf`, `git push --force`, `git reset --hard` 같은 비가역 명령을 자동 차단합니다.

→ [examples/hooks/guard-dangerous-bash.ps1](../examples/hooks/guard-dangerous-bash.ps1) (Windows)
→ `~/.claude/settings.json` 의 `PreToolUse` 훅으로 등록 ([07-settings-backup.md](07-settings-backup.md) 참고)

## 3) 메모리 켜기

`~/.claude/projects/<프로젝트>/memory/MEMORY.md` 인덱스를 만들면, Claude가 세션을 넘어 사용자 취향·결정을 기억합니다.

→ [03-memory.md](03-memory.md)

## 4) 필요한 스킬만 설치

PPT·문서·시각화 등 자주 하는 작업이 있으면 해당 스킬을 `~/.claude/skills/` 에 둡니다.

→ [02-skills.md](02-skills.md)

## 5) (선택) 자동 보고·백업

매일/매주 도는 보고나 설정 백업을 OS 스케줄러에 등록합니다.

→ [04-automation.md](04-automation.md), [07-settings-backup.md](07-settings-backup.md)

---

## 추천 도입 순서

| 순서 | 항목 | 체감 효과 | 난이도 |
|---|---|---|---|
| 1 | CLAUDE.md 글로벌 지침 | ★★★ | 쉬움 |
| 2 | 위험명령 차단 훅 | ★★★ | 쉬움 |
| 3 | 메모리 시스템 | ★★★ | 중간 |
| 4 | UTF-8 BOM 훅(한글 Windows) | ★★ | 쉬움 |
| 5 | 세션 컨텍스트 훅 | ★★ | 중간 |
| 6 | 스킬 설치 | ★★ | 쉬움 |
| 7 | 자동 보고·백업 | ★★ | 중간 |
| 8 | MCP 연결 | ★★ | 중간 |
| 9 | caveman 토큰 압축 | ★ | 쉬움 |
| 10 | 양 머신 동기화 | ★ | 어려움 |
