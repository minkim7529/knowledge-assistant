import uuid

from app.config import get_settings
from app.db.client import get_supabase


def create_document(filename: str, mime_type: str) -> str:
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .insert({"filename": filename, "mime_type": mime_type})
        .execute()
    )
    return result.data[0]["id"]


def insert_chunks(document_id: str, chunks: list[str], embeddings: list[list[float]]) -> int:
    supabase = get_supabase()
    rows = [
        {
            "document_id": document_id,
            "chunk_index": index,
            "content": content,
            "embedding": embedding,
        }
        for index, (content, embedding) in enumerate(zip(chunks, embeddings))
    ]
    if not rows:
        return 0
    supabase.table("chunks").insert(rows).execute()
    return len(rows)


def upload_image_file(filename: str, content: bytes, mime_type: str) -> str:
    settings = get_settings()
    supabase = get_supabase()
    storage_path = f"{uuid.uuid4()}_{filename}"
    supabase.storage.from_(settings.supabase_image_bucket).upload(
        storage_path,
        content,
        file_options={"content-type": mime_type, "upsert": "true"},
    )
    return storage_path


def create_image(filename: str, storage_path: str, caption: str, embedding: list[float]) -> str:
    supabase = get_supabase()
    result = (
        supabase.table("images")
        .insert(
            {
                "filename": filename,
                "storage_path": storage_path,
                "caption": caption,
                "embedding": embedding,
            }
        )
        .execute()
    )
    return result.data[0]["id"]


def list_documents() -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id, filename, mime_type, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def list_images() -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("images")
        .select("id, filename, storage_path, caption, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_image_public_url(storage_path: str) -> str:
    settings = get_settings()
    supabase = get_supabase()
    return supabase.storage.from_(settings.supabase_image_bucket).get_public_url(storage_path)


def create_conversation() -> str:
    supabase = get_supabase()
    result = supabase.table("conversations").insert({}).execute()
    return result.data[0]["id"]


def add_message(conversation_id: str, role: str, content: str, citations: list[dict]) -> None:
    supabase = get_supabase()
    supabase.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "citations": citations,
        }
    ).execute()
