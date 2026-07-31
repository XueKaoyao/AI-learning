'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthTokenGetter } from '@myworkspace/fetch';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type UserState = {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    { name: 'user-auth-storage' },
  ),
);

// 让 apiFetch 自动带上登录 token
setAuthTokenGetter(() => useUserStore.getState().token);
