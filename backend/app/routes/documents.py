from fastapi import APIRouter, HTTPException, UploadFile

from app.db.repository import create_document, insert_chunks, list_documents
from app.services.chunking import chunk_text
from app.services.gemini import get_gemini_service
from app.services.parsing import SUPPORTED_MIME_TYPES, extract_text

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
async def get_documents() -> list[dict]:
    return list_documents()


@router.post("")
async def upload_document(file: UploadFile) -> dict[str, int | str]:
    if file.content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다: {file.content_type}",
        )

    content = await file.read()
    text = extract_text(content, file.content_type)
    if not text.strip():
        raise HTTPException(status_code=400, detail="문서에서 텍스트를 추출하지 못했습니다.")

    chunks = chunk_text(text)
    embeddings = get_gemini_service().embed_texts(chunks)

    document_id = create_document(file.filename or "unnamed", file.content_type)
    stored = insert_chunks(document_id, chunks, embeddings)

    return {"document_id": document_id, "chunk_count": stored}
