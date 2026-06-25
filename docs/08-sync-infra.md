# 08. 양 머신 동기화 — 회사 Windows ↔ 집 Mac

## 문제

회사에서는 Windows, 집에서는 Mac을 씁니다. 어느 컴퓨터에서 Claude Code를 켜도 **같은 글로벌 지침·스킬·메모리·훅·자동루틴**이 있어야 합니다. 그런데:

- OS가 달라 훅 스크립트가 다름(PowerShell ↔ Bash)
- 일부는 동기화하면 안 됨(자격증명, 머신별 런타임 상태)

## 해법: `dotclaude` 패턴

설정을 git 저장소(`dotclaude/`)에 모아두고, OS별 `apply` 스크립트가 해당 머신의 올바른 위치로 복사·분기합니다.

```
dotclaude/
├── CLAUDE.md                 # 글로벌 지침 (OS 무관)
├── skills/                   # 커스텀 스킬 (OS 무관)
├── scheduled-tasks/          # 자동 루틴 정의 (OS-agnostic화)
├── memory/                   # portable 메모리
├── hooks/
│   ├── windows/              # PowerShell 훅
│   └── mac/                  # Bash 훅 (동등 동작)
├── settings/
│   ├── settings.windows.json # PowerShell 훅 경로로 분기
│   └── settings.mac.json     # Bash 훅 경로로 분기
├── launchd/                  # Mac 스케줄러 plist
└── scripts/
    ├── apply-windows.ps1     # Windows 적용 (dry-run → -Apply)
    ├── apply-mac.sh          # Mac 적용
    └── bootstrap-mac.sh      # Mac 첫 세팅 자동화(clone~등록)
```

---

## 동기화 범위 결정 (핵심)

### ✅ 동기화하는 것
글로벌 CLAUDE.md, 스킬, 자동루틴 정의, 메모리, 훅(OS별 동등본), settings(OS별 분기), 백업 스크립트, 프로젝트별 `CLAUDE.md`/스킬.

### ❌ 동기화하지 않는 것 (이유)
| 항목 | 이유 | 대처 |
|---|---|---|
| `.credentials.json` | 토큰 유출 위험 | 머신마다 최초 로그인 |
| GitHub/MCP 토큰 | 자격증명 | `gh auth login`, `/mcp` 인증 |
| 스케줄러 등록 | OS별 시스템 등록 | Mac은 bootstrap이 자동, Win은 수동 |
| `~/.claude.json` | 머신별 런타임 상태 | 동기화 안 함 |
| 세션 로그·snapshots·tasks·backups | 런타임 상태 | 동기화 안 함 |

> 원칙: **portable한 정의는 동기화, 자격증명·런타임 상태는 머신별.**

---

## 왜 OS별 분기가 필요한가

훅은 OS마다 스크립트 언어가 다릅니다. `settings.windows.json`은 PowerShell 훅 경로를, `settings.mac.json`은 Bash 훅 경로를 가리킵니다. `apply` 스크립트가 현재 OS에 맞는 버전을 `~/.claude/settings.json`으로 깝니다. 정의는 한 저장소에 있지만, 적용은 OS-aware.

UTF-8 BOM 훅처럼 **Windows에만 필요한 훅**은 Windows 쪽에만 둡니다.

## 적용 흐름

```bash
# 한 머신에서 설정 수정 → dotclaude로 옮기고 커밋
cp -r ~/.claude/skills/my-new-skill dotclaude/skills/
git add dotclaude/ && git commit -m "feat(dotclaude): add my-new-skill" && git push

# 다른 머신에서
git pull
cd dotclaude/scripts && ./apply-mac.sh --apply   # 또는 .\apply-windows.ps1 -Apply
```

## Mac 첫 세팅 자동화

`bootstrap-mac.sh --apply` 한 번으로: 필수 도구 설치(git/gh/uv/node) → 워크스페이스 clone → dotclaude 적용 → 의존성 설치 → launchd 등록. 남는 건 자격증명(`gh auth login`, `claude` 로그인, `/mcp` 인증)뿐.

---

## 이 패턴의 가치

- **이사 비용 제로화** — 새 머신에서 스크립트 한 번이면 동일 환경.
- **단일 진실 소스** — 설정 변경은 dotclaude에서. 양쪽 손으로 맞추는 drift 제거.
- **안전** — 자격증명은 구조적으로 동기화에서 빠짐.

> 적용 스크립트는 항상 **dry-run(미리보기) → `-Apply`** 2단계로. 실수로 덮어쓰기 전에 무엇이 바뀌는지 보고 적용하세요.
