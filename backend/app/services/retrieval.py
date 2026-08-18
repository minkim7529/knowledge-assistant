from dataclasses import dataclass

from app.db.client import get_supabase
from app.services.gemini import get_gemini_service

RRF_K = 60
CANDIDATE_COUNT = 20
RERANK_TOP_K = 5


@dataclass
class RetrievedItem:
    type: str  # "chunk" | "image"
    id: str
    document_id: str | None
    text: str  # LLM 근거 및 재순위화에 사용하는 텍스트 (content 또는 caption)
    filename: str | None = None
    storage_path: str | None = None
    chunk_index: int | None = None


def _rrf_merge(ranked_lists: list[list[str]]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for position, key in enumerate(ranked):
            scores[key] = scores.get(key, 0.0) + 1.0 / (RRF_K + position + 1)
    return scores


def hybrid_search(query: str) -> list[RetrievedItem]:
    supabase = get_supabase()
    gemini = get_gemini_service()
    query_embedding = gemini.embed_text(query)

    vector_chunks = (
        supabase.rpc(
            "match_chunks",
            {"query_embedding": query_embedding, "match_count": CANDIDATE_COUNT},
        )
        .execute()
        .data
    )
    fts_chunks = (
        supabase.rpc("search_chunks_fts", {"query": query, "match_count": CANDIDATE_COUNT})
        .execute()
        .data
    )
    vector_images = (
        supabase.rpc(
            "match_images",
            {"query_embedding": query_embedding, "match_count": CANDIDATE_COUNT},
        )
        .execute()
        .data
    )
    fts_images = (
        supabase.rpc("search_images_fts", {"query": query, "match_count": CANDIDATE_COUNT})
        .execute()
        .data
    )

    items_by_key: dict[str, RetrievedItem] = {}
    ranked_lists: list[list[str]] = []

    sources: list[tuple[list[dict], str, str]] = [
        (vector_chunks, "chunk", "content"),
        (fts_chunks, "chunk", "content"),
        (vector_images, "image", "caption"),
        (fts_images, "image", "caption"),
    ]

    for rows, item_type, text_field in sources:
        keys = []
        for row in rows:
            key = f"{item_type}:{row['id']}"
            keys.append(key)
            if key not in items_by_key:
                items_by_key[key] = RetrievedItem(
                    type=item_type,
                    id=row["id"],
                    document_id=row.get("document_id"),
                    text=row[text_field],
                    filename=row.get("filename"),
                    storage_path=row.get("storage_path"),
                    chunk_index=row.get("chunk_index"),
                )
        ranked_lists.append(keys)

    scores = _rrf_merge(ranked_lists)
    candidate_keys = sorted(scores, key=lambda k: scores[k], reverse=True)
    candidates = [items_by_key[key] for key in candidate_keys]

    if not candidates:
        return []

    order = gemini.rerank(query, [c.text for c in candidates], RERANK_TOP_K)
    return [candidates[i] for i in order]
