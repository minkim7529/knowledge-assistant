DEFAULT_MAX_CHARS = 1000
DEFAULT_OVERLAP_CHARS = 150


def chunk_text(
    text: str,
    max_chars: int = DEFAULT_MAX_CHARS,
    overlap_chars: int = DEFAULT_OVERLAP_CHARS,
) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    units = _split_oversized(paragraphs, max_chars)

    chunks: list[str] = []
    current = ""
    for unit in units:
        candidate = f"{current}\n\n{unit}" if current else unit
        if len(candidate) <= max_chars:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = f"{current[-overlap_chars:]}\n\n{unit}" if overlap_chars else unit
        else:
            current = unit

    if current:
        chunks.append(current)

    return chunks


def _split_oversized(paragraphs: list[str], max_chars: int) -> list[str]:
    units: list[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            units.append(paragraph)
            continue
        for start in range(0, len(paragraph), max_chars):
            units.append(paragraph[start : start + max_chars])
    return units
