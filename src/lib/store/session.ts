"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_USER_ID } from "@/lib/auth/roles";

type SessionState = {
  userId: string;
  setUserId: (id: string) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: DEFAULT_USER_ID,
      setUserId: (id) => set({ userId: id }),
    }),
    { name: "rmfs-session" },
  ),
);

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  const userId = useSessionStore.getState().userId;
  if (userId) headers.set("x-user-id", userId);
  return headers;
}

export function apiFetch(input: string, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: apiHeaders(init.headers),
  });
}
