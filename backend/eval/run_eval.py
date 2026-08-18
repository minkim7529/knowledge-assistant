"""검색 파이프라인(하이브리드 검색 + 재순위화)의 정확도를 재는 스크립트.

dataset.json의 각 질문에 대해 hybrid_search를 실제로 호출하고,
기대하는 근거(expected_marker)가 top-K 결과 안에 포함되는지 확인한다.

실행: backend/ 에서 `./.venv/Scripts/python.exe -m eval.run_eval`
"""

import json
from pathlib import Path

from app.services.retrieval import hybrid_search

DATASET_PATH = Path(__file__).parent / "dataset.json"


def run() -> None:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    hits = 0
    reciprocal_ranks = []

    for case in dataset:
        results = hybrid_search(case["question"])
        rank = None
        for i, item in enumerate(results):
            if item.type == case["expected_type"] and case["expected_marker"] in item.text:
                rank = i + 1
                break

        hit = rank is not None
        hits += hit
        reciprocal_ranks.append(1 / rank if hit else 0)

        status = f"HIT (rank {rank})" if hit else "MISS"
        print(f"[{status}] {case['question']}")

    total = len(dataset)
    hit_rate = hits / total
    mrr = sum(reciprocal_ranks) / total

    print()
    print(f"Hit@5: {hits}/{total} ({hit_rate:.0%})")
    print(f"MRR: {mrr:.2f}")


if __name__ == "__main__":
    run()
