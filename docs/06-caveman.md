# 06. caveman — 토큰 압축 응답 모드

## 무엇

`caveman`은 Claude의 응답을 "원시인 말투"처럼 압축해, **기술적 내용은 그대로 두고 군더더기(관사·인사말·헤지·필러)만 제거**하는 플러그인입니다. 같은 작업을 더 적은 토큰으로 처리합니다.

- 출처: 마켓플레이스 `JuliusBrussee/caveman` ([github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman))
- 설치: `settings.json`의 `extraKnownMarketplaces` + `enabledPlugins`로 활성
- 전환: `/caveman lite|full|ultra`, 해제: "stop caveman" / "normal mode"

## 강도(레벨)

| 레벨 | 압축 정도 | 용도 |
|---|---|---|
| `lite` | 약함 | 가독성 유지하며 약간 축약 |
| `full` | 기본 | 관사·필러·인사말 제거 |
| `ultra` | 강함 | 단편 문장, 최대 압축(~75% 절감) |

> 단, **코드·커밋·PR·보안 경고·비가역 작업 확인**은 압축하지 않고 정상 문장으로 씁니다(오해 방지).

---

## 왜 썼나

- **비용·속도** — 긴 세션에서 출력 토큰이 누적되면 비용과 지연이 커집니다. 군더더기를 줄이면 핵심 전달 속도가 빨라집니다.
- **신호 대 잡음** — "물론이죠! 기꺼이 도와드리겠습니다…" 같은 빈말 제거 → 실제 정보 밀도 상승.

## 함께 들어오는 것들

caveman 마켓플레이스는 압축 모드 외에도 유용한 서브 도구를 제공합니다:

- **cavecrew 서브에이전트** — 출력을 압축해 돌려주는 전문 에이전트(메인 컨텍스트 ~60% 절약)
  - `cavecrew-investigator`: 읽기 전용 코드 위치 탐색(파일:라인 표)
  - `cavecrew-builder`: 1~2파일 외과적 수정
  - `cavecrew-reviewer`: diff/브랜치 리뷰(한 줄/지적)
- **caveman-commit** — 압축된 Conventional Commits 메시지 생성
- **caveman-review** — 한 줄/지적식 PR 리뷰 코멘트
- **caveman-compress** — 메모리 파일(CLAUDE.md 등)을 caveman 포맷으로 압축(입력 토큰 절감)
- **caveman-stats** — 세션 실제 토큰 사용·절감 추정 표시

## 설정 예시

```jsonc
{
  "extraKnownMarketplaces": {
    "caveman": { "source": { "source": "github", "repo": "JuliusBrussee/caveman" } }
  },
  "enabledPlugins": { "caveman@caveman": true },
  "statusLine": {
    "type": "command",
    "command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"<caveman캐시>\\caveman-statusline.ps1\""
  }
}
```

## 주의

- 외부 플러그인입니다. 활성 전에 저장소를 확인하고 본인 정책(라이선스·코드 실행)에 맞는지 점검하세요.
- 압축이 과하면 협업자가 읽기 불편할 수 있으니, 공유 산출물은 정상 문장으로.
