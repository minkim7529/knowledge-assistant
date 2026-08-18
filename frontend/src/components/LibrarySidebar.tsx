"use client";

import useSWR from "swr";
import { listDocuments, listImages } from "@/lib/api";
import { UploadZone } from "@/components/UploadZone";

export function LibrarySidebar() {
  const { data: documents = [], mutate: mutateDocuments } = useSWR("documents", listDocuments);
  const { data: images = [], mutate: mutateImages } = useSWR("images", listImages);

  function refresh() {
    mutateDocuments();
    mutateImages();
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-neutral-200 p-4 dark:border-neutral-800">
      <h1 className="text-lg font-semibold">지식 어시스턴트</h1>
      <UploadZone onUploaded={refresh} />

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          문서 ({documents.length})
        </h2>
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li key={doc.id} className="truncate rounded px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">
              {doc.filename}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          이미지 ({images.length})
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={img.caption}
              title={img.caption}
              className="aspect-square w-full rounded object-cover"
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
