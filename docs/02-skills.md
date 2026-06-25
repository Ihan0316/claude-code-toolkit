# 02. 스킬(Skills) — 작업 절차를 캡슐화

## 스킬이란?

스킬은 "이런 작업은 이렇게 해라"는 **검증된 절차 + 도구 묶음**을 마크다운(+스크립트)으로 캡슐화한 모듈입니다. 사용자가 관련 작업을 요청하면 Claude가 알아서 해당 스킬을 불러 그 절차대로 수행합니다.

- 위치: `~/.claude/skills/<skill-name>/SKILL.md`
- 호출: 사용자가 `/skill-name` 으로 직접, 또는 Claude가 설명(description)을 보고 자동 선택
- 핵심: 각 스킬의 `description`이 트리거 정확도를 좌우 → 언제 써야 하는지 구체적으로 적는 게 중요

**왜 쓰나**: "PPT 만들어줘" 한마디에, 매번 다른 방식이 아니라 **항상 같은 검증된 절차**가 적용됩니다. 좋은 작업 방식을 한 번 정의해두면 재사용됩니다.

---

## 실무에서 자주 쓴 스킬 (직접 설치)

| 스킬 | 용도 | 언제 빛났나 |
|---|---|---|
| `pptx` | PowerPoint 생성/편집/읽기 | 보고용 슬라이드 초안 자동 생성 |
| `anydesign` | 이미지·웹·Figma의 디자인을 토큰/컴포넌트로 추출 | 레퍼런스 UI 분석·복제 |
| `d3-viz` | d3.js 인터랙티브 시각화 | 커스텀 차트·네트워크 다이어그램 |
| `frontend-design` | 완성도 높은 프런트엔드 UI 생성 | 랜딩·대시보드 초안 |
| `frontend-slides` | HTML 애니메이션 프레젠테이션 | 발표용 웹 슬라이드 |
| `theme-factory` | 산출물에 일관된 테마(색·폰트) 적용 | 슬라이드·문서 스타일 통일 |
| `web-artifacts-builder` | React/Tailwind/shadcn 복합 아티팩트 | 상태관리 있는 데모 |
| `webapp-testing` | Playwright로 로컬 웹앱 검증 | 프런트 동작·스크린샷 확인 |
| `pytorch-patterns` | PyTorch 학습 파이프라인 베스트프랙티스 | 재현 가능한 학습 코드 |
| `senior-computer-vision` | 객체탐지·세그멘테이션·배포 | YOLO/DETR 파이프라인, ONNX/TensorRT |
| `mcp-builder` | MCP 서버 제작 가이드 | 외부 API를 Claude 도구로 |
| `prompt-improver` | 모호한 프롬프트를 리서치·질문으로 보강 | 훅과 연동해 되묻기 |
| `recursive-research` | 자기조절 재귀 심층 리서치 | 도메인 깊이 탐구 |

> 컴퓨터 비전 배경 + 프런트 보고 산출물 조합이라, **CV 학습(pytorch/cv) + 보고 산출물(pptx/frontend/theme) 양쪽**을 함께 깔았습니다.

---

## 번들로 함께 쓴 스킬군

설치하지 않아도 기본 제공되거나 묶음으로 들어오는 유용한 스킬들:

- **anthropic-skills**: `docx`, `pdf`, `xlsx`, `pptx`(오피스 문서 전반), `consolidate-memory`(메모리 정리), `skill-creator`(스킬 제작), `schedule`(자동작업 등록)
- **engineering**: `code-review`, `debug`, `system-design`, `testing-strategy`, `tech-debt`, `documentation`, `deploy-checklist`, `incident-response`, `standup`, `architecture`
- **design**: `design-critique`, `accessibility-review`, `design-system`, `design-handoff`, `ux-copy`, `user-research`, `research-synthesis`
- **caveman**: 토큰 압축 모드 ([06-caveman.md](06-caveman.md) 별도)

---

## 스킬 고를 때 기준

1. **반복하는 작업인가** — 한 번 하고 말 거면 스킬화 불필요.
2. **절차가 표준화되는가** — "항상 이 순서로 하는 게 맞다"가 있으면 스킬 후보.
3. **description이 명확한가** — 트리거가 애매하면 엉뚱할 때 발동하거나 정작 필요할 때 안 뜸.

## 직접 만들기

`skill-creator` 스킬로 새 스킬을 생성·평가·최적화할 수 있습니다. 핵심은 `SKILL.md`의 frontmatter:

```markdown
---
name: my-skill
description: <언제 이 스킬을 써야 하는지 — 구체적 트리거 문구를 나열>
---

<수행 절차. 단계별로. 도구 사용 규칙 포함.>
```

→ 출처: 스킬은 [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) 같은 모음을 1차 소스로 참고해 `~/.claude/skills/`에 설치하면 됩니다.
