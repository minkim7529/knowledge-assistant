# 멀티모달 개인 지식 어시스턴트

문서(PDF/DOCX/TXT)랑 이미지를 올려두면, 하나의 지식베이스 안에서 텍스트와 이미지를 같이 검색해서(RAG) 출처를 인용하며 답해주는 개인용 어시스턴트입니다.

## 아키텍처

```
[Next.js 프론트엔드] ──REST/SSE──▶ [FastAPI 백엔드]
                                        │
                    ┌───────────────────┼────────────────────┐
                    ▼                   ▼                    ▼
              문서 파싱/청킹        Gemini API           Supabase(Postgres
              (PDF/DOCX/TXT)   (임베딩/이미지캡션/       + pgvector + 풀텍스트)
                                  답변 생성)                    │
                    │                   │                      │
                    └──────chunk/caption 텍스트──────────────────┘
                                        │
                          검색 시점: 하이브리드 검색
                    (pgvector 코사인 유사도 + Postgres BM25/FTS)
                          → RRF로 결과 병합
                          → Gemini에게 후보를 다시 보여주고 관련도 순으로 재순위화
                          → 상위 K개를 Gemini에 근거로 전달, 인용 포함 답변 생성/스트리밍
```

## 기술 스택

- 백엔드: Python (배포는 3.12, 로컬은 3.14) + FastAPI
- 프론트엔드: Next.js 15 + TypeScript + Tailwind
- DB/벡터스토어: Supabase (Postgres + pgvector)
- LLM/임베딩/비전/재순위화: Gemini API 단일 사용

재순위화는 원래 `sentence-transformers` 로컬 cross-encoder로 구현했으나, torch 의존성이 Render 무료 플랜(512MB)에서 포트 바인딩을 막을 만큼 무거워서 Gemini에게 후보를 다시 보여주고 관련도 순으로 골라달라고 요청하는 방식(LLM 기반 재순위화)으로 교체했다. 호출이 실패하면 RRF 순서로 자동 폴백한다.

## 진행 상태

- [x] 1단계: 스캐폴딩 (백엔드/프론트엔드 뼈대, DB 스키마)
- [x] 2단계: 문서 수집 파이프라인
- [x] 3단계: 이미지 수집 파이프라인
- [x] 4단계: 검색 파이프라인 (하이브리드 검색 + 재순위화)
- [x] 5단계: 답변 생성 (인용 포함 스트리밍)
- [x] 6단계: 프론트엔드 채팅 UI
- [x] 실제 Gemini API + Supabase로 업로드→검색→답변 전체 흐름 라이브 검증 (텍스트 문서 + 이미지 모두)
- [x] 접근 제한(passcode) 게이트 — `APP_PASSCODE` 설정 시에만 활성화, 로컬 개발은 영향 없음
- [x] 검색 정확도 평가셋 작성 및 실행
- [x] 프론트엔드 배포 (Vercel): https://frontend-two-zeta-32.vercel.app
- [x] 백엔드 배포 (Render): https://knowledge-assistant-backend-e7xj.onrender.com
- [x] 실제 배포 사이트에서 접근 코드 → 업로드 라이브러리 → 질문/답변/인용까지 브라우저로 최종 검증 완료

**7단계(마무리) 전부 완료.**

라이브 테스트/배포에서 발견/수정한 것:
- 임베딩 모델이 `text-embedding-004`에서 `gemini-embedding-001`로 교체됨 (output_dimensionality=768로 강제해 기존 스키마 유지)
- 생성 모델도 `gemini-2.5-flash`가 신규 키에서 제공 종료되어 `gemini-3.6-flash`로 교체했다가, 무료 티어 일일 할당량(모델당 하루 20회)을 테스트하며 소진해 더 넉넉한 `gemini-flash-lite-latest`로 다시 교체
- 프론트엔드 채팅 말풍선에서 긴 인용 텍스트가 flex 컨테이너 폭 제약을 무시하고 넘치던 CSS 버그 수정 (`min-w-0` 체인)
- 답변에 마크다운 기호가 그대로 노출되던 것을 프롬프트에서 방지
- Render 무료 플랜(512MB)은 `sentence-transformers`/torch를 로드하다 포트 바인딩 타임아웃으로 배포가 실패해, 로컬 cross-encoder 재순위화를 Gemini 기반 재순위화로 교체
- Gemini의 `generate_content_stream`을 배포 환경에서 디버깅하던 중 실제 원인이 스트리밍이 아니라 위 할당량 문제였음을 확인. 다만 이미 non-streaming 호출 후 텍스트를 잘라 SSE로 순차 전송하는 방식으로 바꿔둔 상태라 그대로 유지 (진짜 토큰 스트리밍은 아니지만 프론트엔드에는 점진적으로 표시됨)

**알려진 제약**: Gemini 무료 API 키는 모델당 하루 요청 수가 제한적이다(예: `gemini-3.6-flash`는 20회/일). 공개 데모를 많이 테스트하면 429 오류가 날 수 있으며, 유료 플랜으로 올리거나 요청이 적은 모델로 바꿔서 완화할 수 있다.

## 검색 정확도 평가

`backend/eval/dataset.json`에 서로 다른 주제(레시피·역사·과학·프로젝트 설명·이미지) 문서/이미지에 대한 질문 8개를 정의하고, `backend/eval/run_eval.py`가 실제 `hybrid_search`를 호출해 기대하는 근거가 top-5 안에 있는지 확인한다.

```bash
cd backend
./.venv/Scripts/python.exe -m eval.run_eval
```

현재 결과: **Hit@5 8/8 (100%), MRR 0.94** — 5개의 서로 다른 문서/이미지를 모두 top-5 안에서 찾아낸다. (다만 코퍼스가 5개 항목으로 작아 100%가 나오기 쉬운 조건이라는 점은 참고. 문서를 더 추가하며 이 스크립트로 계속 검증할 수 있다.)

## 로컬 개발

### 백엔드

```bash
cd backend
py -3.14 -m venv .venv
./.venv/Scripts/pip install -r requirements.txt
cp .env.example .env   # GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY 채우기
./.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

Supabase 프로젝트 생성 후 `backend/db/schema.sql`을 SQL Editor에서 실행해 테이블을 만든다.

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```
