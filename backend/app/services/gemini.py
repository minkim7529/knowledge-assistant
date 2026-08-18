from collections.abc import Iterator
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import get_settings

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768

CAPTION_PROMPT = (
    "이 이미지에 무엇이 보이는지 한국어로 상세히 설명해줘. "
    "이미지 안의 텍스트(있다면)도 그대로 옮겨 적어줘. "
    "이 설명은 나중에 검색으로 이 이미지를 찾는 데 쓰일 거야."
)

ANSWER_SYSTEM_PROMPT = (
    "너는 사용자가 업로드한 문서와 이미지를 근거로 답하는 지식 어시스턴트야. "
    "아래 제공된 근거(context)에 있는 내용만 바탕으로 답하고, "
    "각 문장 뒤에 어떤 근거를 사용했는지 [1], [2]처럼 번호로 표시해. "
    "근거에 없는 내용은 답하지 말고 모른다고 말해. "
    "답변은 마크다운 기호(**, #, - 등) 없이 일반 텍스트로만 작성해."
)


class GeminiService:
    def __init__(self, api_key: str, model: str) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        result = self._client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        return [embedding.values for embedding in result.embeddings]

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def caption_image(self, image_bytes: bytes, mime_type: str) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                CAPTION_PROMPT,
            ],
        )
        return response.text.strip()

    def stream_answer(self, question: str, context_blocks: list[str]) -> Iterator[str]:
        context = "\n\n".join(
            f"[{i + 1}] {block}" for i, block in enumerate(context_blocks)
        )
        prompt = f"{ANSWER_SYSTEM_PROMPT}\n\n--- 근거 ---\n{context}\n\n--- 질문 ---\n{question}"
        stream = self._client.models.generate_content_stream(
            model=self._model,
            contents=prompt,
        )
        for chunk in stream:
            if chunk.text:
                yield chunk.text


@lru_cache
def get_gemini_service() -> GeminiService:
    settings = get_settings()
    return GeminiService(settings.gemini_api_key, settings.gemini_model)
