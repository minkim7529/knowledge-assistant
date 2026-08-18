const STORAGE_KEY = "app_passcode";

export function getStoredPasscode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setStoredPasscode(code: string): void {
  window.localStorage.setItem(STORAGE_KEY, code);
}

export function passcodeHeaders(): Record<string, string> {
  const code = getStoredPasscode();
  return code ? { "X-App-Passcode": code } : {};
}
