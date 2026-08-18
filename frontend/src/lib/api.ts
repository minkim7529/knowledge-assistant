import { passcodeHeaders } from "@/lib/passcode";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DocumentItem = {
  id: string;
  filename: string;
  mime_type: string;
  created_at: string;
};

export type ImageItem = {
  id: string;
  filename: string;
  storage_path: string;
  caption: string;
  created_at: string;
  url: string;
};

export type Citation = {
  type: "chunk" | "image";
  id: string;
  filename: string | null;
  excerpt: string;
  url: string | null;
};

export async function uploadDocument(file: File): Promise<{ document_id: string; chunk_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/documents`, {
    method: "POST",
    headers: passcodeHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadImage(file: File): Promise<{ image_id: string; caption: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/images`, {
    method: "POST",
    headers: passcodeHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_URL}/documents`, { headers: passcodeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listImages(): Promise<ImageItem[]> {
  const res = await fetch(`${API_URL}/images`, { headers: passcodeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function checkPasscode(code: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/health`, {
    headers: code ? { "X-App-Passcode": code } : {},
  });
  return res.ok;
}

type ChatCallbacks = {
  onCitations: (citations: Citation[]) => void;
  onToken: (text: string) => void;
  onDone: (conversationId: string) => void;
  onError: (error: Error) => void;
};

export async function streamChat(
  question: string,
  conversationId: string | null,
  callbacks: ChatCallbacks,
): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...passcodeHeaders() },
      body: JSON.stringify({ question, conversation_id: conversationId }),
    });
    if (!res.ok || !res.body) throw new Error(await res.text());

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const eventLine = rawEvent.split("\n").find((line) => line.startsWith("event: "));
        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.slice("event: ".length);
        const data = JSON.parse(dataLine.slice("data: ".length));

        if (event === "citations") callbacks.onCitations(data as Citation[]);
        else if (event === "token") callbacks.onToken((data as { text: string }).text);
        else if (event === "done") callbacks.onDone((data as { conversation_id: string }).conversation_id);
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
