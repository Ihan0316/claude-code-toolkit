# 07. 설정(settings.json) · 상태줄 · 백업

## settings.json — 환경의 단일 진실

`~/.claude/settings.json`은 훅·플러그인·상태줄·테마·자동업데이트 등 Claude Code 동작 전반을 정의합니다. 이 파일 하나로 환경을 재현할 수 있게 관리하는 게 핵심입니다.

### 이 셋업에서 켠 주요 항목

| 항목 | 값 | 이유 |
|---|---|---|
| `hooks` | 5종 등록 | 안전·맥락 자동화 ([01-hooks.md](01-hooks.md)) |
| `statusLine` | caveman 상태줄 | 현재 모드/토큰 상태 표시 |
| `theme` | `dark` | 가독성 |
| `autoUpdatesChannel` | `latest` | 최신 기능 추적 |
| `enabledPlugins` | `caveman@caveman` | 토큰 압축 |
| `inputNeededNotifEnabled` / `agentPushNotifEnabled` | `true` | 입력 필요·에이전트 완료 알림(자리 비울 때 유용) |
| `remoteControlAtStartup` | `true` | 원격 제어 시작 |

전체 예시: [examples/settings.json](../examples/settings.json)

### settings.json vs settings.local.json

- `settings.json` — 공유 가능한 설정(훅 등록, 플러그인). git 동기화 OK.
- `settings.local.json` — 머신별 경로·권한(예: 해당 머신의 python 경로). **동기화 제외.**

---

## 상태줄(statusLine)

화면 하단에 커스텀 정보를 띄웁니다. 이 셋업은 caveman 플러그인의 상태줄 스크립트로 현재 압축 모드·세션 상태를 표시합니다. 명령형(`type: "command"`)이라 어떤 스크립트든 붙일 수 있습니다(예: 현재 브랜치, 토큰 사용량).

---

## 주간 백업 — 설정 유실 방지

설정·메모리·스킬은 시간이 쌓일수록 자산이 됩니다. 날아가면 복구 비용이 큽니다. 그래서 **주 1회 zip 백업**을 자동화했습니다.

**백업 범위**:
- `~/.claude/` 전체 (단, `.credentials.json` 제외 — 토큰 유출 방지)
- `~/.claude.json` (런타임 설정)
- 각 프로젝트의 `.claude/`, `CLAUDE.md`

**보관 정책**: 최근 8개 zip만 유지(오래된 건 자동 삭제).

**왜 이렇게**:
- 자격증명은 일부러 **제외** — 백업 zip이 새도 토큰은 안 샘.
- 8주 롤링 — 무한 누적 방지 + 충분한 복구 창.
- 세션 시작 훅이 "마지막 백업 N일 전 ⚠️"를 표시 → 백업이 멈추면 바로 인지.

### 등록

- Windows: 작업 스케줄러에 `Claude Settings Weekly Backup` 작업으로 백업 스크립트를 매주 금 13:00 실행.
- macOS: `launchd` plist로 동일 시각 등록.

> ⚠️ 스케줄러 등록은 시스템 변경 — 직접 확인하며 등록하세요.

---

## 복구

백업 zip을 풀어 `~/.claude/`에 덮어쓰면 됩니다. 단 `.credentials.json`은 백업에 없으므로 복구 후 `claude` 첫 실행에서 재로그인하세요.
