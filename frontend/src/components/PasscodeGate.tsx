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
      <div className="flex h-screen w-full items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-64 flex-col gap-3">
          <h1 className="text-center text-sm font-medium">접근 코드를 입력하세요</h1>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
          {error && <p className="text-center text-xs text-red-500">코드가 올바르지 않습니다.</p>}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            입장
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
