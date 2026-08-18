# 멀티모달 개인 지식 어시스턴트

문서(PDF/DOCX/TXT)와 이미지를 업로드하면, 하나의 통합된 지식베이스에서 텍스트와 이미지를 함께 검색(RAG)해 출처를 인용하며 답변하는 개인 지식 어시스턴트.

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
                          → 로컬 Cross-Encoder로 재순위화
                          → 상위 K개를 Gemini에 근거로 전달, 인용 포함 답변 생성/스트리밍
```

## 기술 스택

- 백엔드: Python 3.14 + FastAPI
- 프론트엔드: Next.js 15 + TypeScript + Tailwind
- DB/벡터스토어: Supabase (Postgres + pgvector)
- LLM/임베딩/비전: Gemini API
- 재순위화: sentence-transformers cross-encoder (로컬)

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
- [ ] 배포 (Vercel/Render)

라이브 테스트에서 발견/수정한 것:
- 임베딩 모델이 `text-embedding-004`에서 `gemini-embedding-001`로 교체됨 (output_dimensionality=768로 강제해 기존 스키마 유지)
- 생성 모델도 `gemini-2.5-flash`가 신규 키에서 제공 종료되어 `gemini-3.6-flash`로 교체
- 프론트엔드 채팅 말풍선에서 긴 인용 텍스트가 flex 컨테이너 폭 제약을 무시하고 넘치던 CSS 버그 수정 (`min-w-0` 체인)
- 답변에 마크다운 기호가 그대로 노출되던 것을 프롬프트에서 방지

## 검색 정확도 평가

`backend/eval/dataset.json`에 서로 다른 주제(레시피·역사·과학·프로젝트 설명·이미지) 문서/이미지에 대한 질문 8개를 정의하고, `backend/eval/run_eval.py`가 실제 `hybrid_search`를 호출해 기대하는 근거가 top-5 안에 있는지 확인한다.

```bash
cd backend
./.venv/Scripts/python.exe -m eval.run_eval
```

현재 결과: **Hit@5 8/8 (100%), MRR 1.00** — 5개의 서로 다른 문서/이미지를 모두 정확히 rank 1로 구분해낸다. (다만 코퍼스가 5개 항목으로 작아 100%가 나오기 쉬운 조건이라는 점은 참고. 문서를 더 추가하며 이 스크립트로 계속 검증할 수 있다.)

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
