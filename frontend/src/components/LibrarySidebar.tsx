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
    <aside className="flex h-full w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
          지
        </span>
        <h1 className="text-lg font-bold text-foreground">지식 어시스턴트</h1>
      </div>

      <UploadZone onUploaded={refresh} />

      <div>
        <h2 className="mb-2 px-1 text-xs font-bold tracking-wide text-muted uppercase">
          문서 ({documents.length})
        </h2>
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="truncate rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent-soft"
            >
              {doc.filename}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 px-1 text-xs font-bold tracking-wide text-muted uppercase">
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
              className="aspect-square w-full rounded-xl border border-border object-cover"
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
