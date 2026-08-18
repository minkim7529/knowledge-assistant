from functools import lru_cache
from typing import Protocol

from sentence_transformers import CrossEncoder

MODEL_NAME = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"
TOP_K = 5


class Rerankable(Protocol):
    text: str


@lru_cache
def _get_model() -> CrossEncoder:
    return CrossEncoder(MODEL_NAME)


def rerank(query: str, candidates: list[Rerankable], top_k: int = TOP_K) -> list[Rerankable]:
    if not candidates:
        return []
    pairs = [(query, item.text) for item in candidates]
    scores = _get_model().predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda pair: pair[1], reverse=True)
    return [item for item, _ in ranked[:top_k]]
