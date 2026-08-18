from fastapi import APIRouter, HTTPException, UploadFile

from app.db.repository import (
    create_image,
    get_image_public_url,
    list_images,
    upload_image_file,
)
from app.services.gemini import get_gemini_service

router = APIRouter(prefix="/images", tags=["images"])

SUPPORTED_IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}


@router.get("")
async def get_images() -> list[dict]:
    images = list_images()
    for image in images:
        image["url"] = get_image_public_url(image["storage_path"])
    return images


@router.post("")
async def upload_image(file: UploadFile) -> dict[str, str]:
    if file.content_type not in SUPPORTED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 이미지 형식입니다: {file.content_type}",
        )

    content = await file.read()
    filename = file.filename or "unnamed"

    gemini = get_gemini_service()
    caption = gemini.caption_image(content, file.content_type)
    embedding = gemini.embed_text(caption)

    storage_path = upload_image_file(filename, content, file.content_type)
    image_id = create_image(filename, storage_path, caption, embedding)

    return {"image_id": image_id, "caption": caption, "storage_path": storage_path}
