import json
from collections.abc import Generator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.db.repository import add_message, create_conversation, get_image_public_url
from app.services.gemini import get_gemini_service
from app.services.retrieval import hybrid_search

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    conversation_id: str | None = None


def _sse(event: str, data: dict | list) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("")
async def chat(request: ChatRequest) -> StreamingResponse:
    items = hybrid_search(request.question)
    citations = [
        {
            "type": item.type,
            "id": item.id,
            "filename": item.filename,
            "excerpt": item.text[:200],
            "url": get_image_public_url(item.storage_path) if item.storage_path else None,
        }
        for item in items
    ]

    def event_stream() -> Generator[str, None, None]:
        yield _sse("citations", citations)

        full_answer = ""
        gemini = get_gemini_service()
        for token in gemini.stream_answer(request.question, [item.text for item in items]):
            full_answer += token
            yield _sse("token", {"text": token})

        conversation_id = request.conversation_id or create_conversation()
        add_message(conversation_id, "user", request.question, [])
        add_message(conversation_id, "assistant", full_answer, citations)
        yield _sse("done", {"conversation_id": conversation_id})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
