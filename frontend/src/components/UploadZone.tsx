"use client";

import { useRef, useState } from "react";
import { uploadDocument, uploadImage } from "@/lib/api";

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type Props = {
  onUploaded: () => void;
};

export function UploadZone({ onUploaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        if (DOCUMENT_TYPES.has(file.type)) {
          setStatus(`업로드 중: ${file.name}`);
          const result = await uploadDocument(file);
          setStatus(`완료: ${file.name} (청크 ${result.chunk_count}개)`);
        } else if (IMAGE_TYPES.has(file.type)) {
          setStatus(`이미지 분석 중: ${file.name}`);
          await uploadImage(file);
          setStatus(`완료: ${file.name}`);
        } else {
          setStatus(`지원하지 않는 형식: ${file.name}`);
          continue;
        }
        onUploaded();
      } catch (err) {
        setStatus(`실패: ${file.name}`);
        console.error(err);
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950"
            : "border-neutral-300 dark:border-neutral-700"
        }`}
      >
        <p className="font-medium">문서·이미지를 드래그하거나 클릭해서 업로드</p>
        <p className="mt-1 text-xs text-neutral-500">PDF · DOCX · TXT · PNG · JPG · WEBP</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {status && <p className="text-xs text-neutral-500">{status}</p>}
    </div>
  );
}
