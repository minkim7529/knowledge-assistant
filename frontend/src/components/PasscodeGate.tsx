"use client";

import { FormEvent, useEffect, useState } from "react";
import { checkPasscode } from "@/lib/api";
import { getStoredPasscode, setStoredPasscode } from "@/lib/passcode";

type Status = "checking" | "locked" | "unlocked";

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    checkPasscode(getStoredPasscode())
      .then((ok) => setStatus(ok ? "unlocked" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    const ok = await checkPasscode(input);
    if (ok) {
      setStoredPasscode(input);
      setStatus("unlocked");
    } else {
      setError(true);
    }
  }

  if (status === "checking") return null;

  if (status === "locked") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <form
          onSubmit={handleSubmit}
          className="flex w-72 flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
            지
          </span>
          <h1 className="text-center text-sm font-semibold text-foreground">접근 코드를 입력하세요</h1>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="rounded-xl border border-border bg-bg px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          {error && <p className="text-center text-xs text-red-500">코드가 올바르지 않습니다.</p>}
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            입장
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
