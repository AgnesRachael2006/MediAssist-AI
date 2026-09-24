import type { SessionUser } from "./types";

const KEY = "mediassist-session";
const ACCOUNTS_KEY = "mediassist-accounts";

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getRegisteredAccounts(): Array<{
  fullName: string;
  email: string;
  password: string;
  role: SessionUser["role"];
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRegisteredAccount(account: {
  fullName: string;
  email: string;
  password: string;
  role: SessionUser["role"];
}) {
  const next = [
    ...getRegisteredAccounts().filter(
      (item) => item.email.toLowerCase() !== account.email.toLowerCase(),
    ),
    account,
  ];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}
