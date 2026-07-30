'use client';

import { useCallback, useState } from 'react';
import { apiFetch, FetchError } from '@myworkspace/fetch';
import { useUserStore, type AuthUser } from '../store/useUserStore';
import { RegisterInput, LoginInput } from '../types/LoginInfoType';

type AuthResponse = {
  user: AuthUser;
  token: string;
};

type UserCrudState = {
  register: (input: RegisterInput) => Promise<AuthUser>;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => void;
  loading: boolean;
};

/**
 * 用户注册 / 登录 CRUD。
 * - register → POST /api/user
 * - login → PUT /api/user
 */
export default function useUserCrud(): UserCrudState {
  const setAuth = useUserStore((s) => s.setAuth);
  const clearAuth = useUserStore((s) => s.clearAuth);
  const [loading, setLoading] = useState(false);

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      setLoading(true);
      try {
        const data = await apiFetch<AuthResponse>('/api/user', {
          method: 'POST',
          data: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
          },
        });
        setAuth(data.user, data.token);
        return data.user;
      } catch (err: unknown) {
        const fetchError =
          err instanceof FetchError
            ? err
            : new FetchError(String(err), {
                status: 0,
                statusText: 'Unknown',
                url: '/api/user',
                category: 'network',
              });
        throw fetchError;
      } finally {
        setLoading(false);
      }
    },
    [setAuth],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<AuthUser> => {
      setLoading(true);
      try {
        const data = await apiFetch<AuthResponse>('/api/user', {
          method: 'PUT',
          data: {
            email: input.email.trim().toLowerCase(),
            password: input.password,
          },
        });
        setAuth(data.user, data.token);
        return data.user;
      } catch (err: unknown) {
        const fetchError =
          err instanceof FetchError
            ? err
            : new FetchError(String(err), {
                status: 0,
                statusText: 'Unknown',
                url: '/api/user',
                category: 'network',
              });
        throw fetchError;
      } finally {
        setLoading(false);
      }
    },
    [setAuth],
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return { register, login, logout, loading };
}
