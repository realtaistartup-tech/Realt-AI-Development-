import type { UserPriorities } from "@/types";

const STORAGE_KEY = "realt-ai:priorities";

/**
 * Session-scoped persistence for the priorities a user has already worked
 * through. Supabase is planned for durable, cross-device storage; until then
 * this keeps the onboarding -> recommendations handoff working without a
 * backend, and never touches anything beyond this browser tab.
 */
export function savePriorities(priorities: UserPriorities): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(priorities));
}

export function loadPriorities(): UserPriorities | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserPriorities;
  } catch {
    return null;
  }
}

export function clearPriorities(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
