"use client";

import { FormEvent, useState } from "react";
import { Citation, streamChat } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

const SUGGESTIONS = [
  "업로드한 문서 내용을 요약해줘",
  "이미지에는 어떤 내용이 있어?",
  "가장 중요한 포인트가 뭐야?",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  async function ask(question: string) {
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input.trim());
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 pt-16">
            <h2 className="text-3xl font-bold text-foreground">무엇이 궁금하세요?</h2>
            <p className="-mt-3 text-sm text-muted">
              왼쪽에서 문서나 이미지를 업로드한 뒤, 내용에 대해 질문해보세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => ask(suggestion)}
                  className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition-colors hover:brightness-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "self-end rounded-br-md bg-user-bubble text-user-bubble-foreground"
                    : "self-start rounded-bl-md border border-border bg-surface text-foreground shadow-sm"
                }`}
              >
                <p>{message.content || (isStreaming && i === messages.length - 1 ? "…" : "")}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                    {message.citations.map((citation, idx) => (
                      <div key={citation.id} className="flex min-w-0 items-start gap-2 text-xs text-muted">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                          {idx + 1}
                        </span>
                        {citation.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={citation.url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
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
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="업로드한 자료에 대해 질문해보세요"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            aria-label="보내기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
