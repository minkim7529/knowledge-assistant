"use client";

import { FormEvent, useState } from "react";
import { Citation, streamChat } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    await streamChat(question, conversationId, {
      onCitations: (citations) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], citations };
          return next;
        });
      },
      onToken: (text) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + text };
          return next;
        });
      },
      onDone: (id) => {
        setConversationId(id);
        setIsStreaming(false);
      },
      onError: (err) => {
        console.error(err);
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "답변 생성 중 오류가 발생했습니다.",
          };
          return next;
        });
      },
    });
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            왼쪽에서 문서나 이미지를 업로드한 뒤, 내용에 대해 질문해보세요.
          </p>
        )}
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`min-w-0 max-w-full rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "self-end bg-blue-600 text-white"
                  : "self-start bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              <p>{message.content || (isStreaming && i === messages.length - 1 ? "…" : "")}</p>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 flex flex-col gap-1 border-t border-neutral-300 pt-2 dark:border-neutral-700">
                  {message.citations.map((citation, idx) => (
                    <div key={citation.id} className="flex min-w-0 items-start gap-2 text-xs text-neutral-500">
                      <span className="shrink-0">[{idx + 1}]</span>
                      {citation.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={citation.url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                      )}
                      <span className="min-w-0 truncate">
                        {citation.filename ?? "출처"}: {citation.excerpt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="업로드한 자료에 대해 질문해보세요"
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  );
}
