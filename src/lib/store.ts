import { createSeedState } from "./mockData";
import type { DemoState } from "./types";

const STORAGE_KEY = "mediassist-demo-v2";
const listeners = new Set<() => void>();

let state: DemoState = createSeedState();
let hydrated = false;

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

export function hydrateDemoState() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as DemoState;
    if (!state.notifications) state = { ...createSeedState(), ...state, notifications: state.notifications ?? [] };
  } catch {
    state = createSeedState();
  }
  listeners.forEach((listener) => listener());
}

export function getDemoState() {
  return state;
}

export function setDemoState(next: DemoState) {
  state = next;
  notify();
}

export function patchDemoState(updater: (current: DemoState) => DemoState) {
  state = updater(state);
  notify();
}

export function resetDemoState() {
  state = createSeedState();
  notify();
}

export function subscribeDemoState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
