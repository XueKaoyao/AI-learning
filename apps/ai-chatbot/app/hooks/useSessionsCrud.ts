import { apiFetch } from '@myworkspace/fetch';
import { RequestSessionType, SessionType } from '../types/SessionManageType';

interface SessionsCrudState {
  createSession: (session: RequestSessionType) => Promise<SessionType>;
  updateSession: ({
    id,
    newData,
  }: {
    id: string;
    newData: RequestSessionType;
  }) => Promise<SessionType>;
  deleteSession: (id: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<SessionType>;
}

export default function useSessionsCrud(): SessionsCrudState {
  const getSession = async (sessionId: string) => {
    const response = await apiFetch<SessionType>(`/api/sessions/${sessionId}`, {
      cacheConfig: { ttl: 0 },
    });
    return response;
  };
  const createSession = async (session: RequestSessionType) => {
    const response = await apiFetch('/api/sessions', {
      method: 'POST',
      data: session,
    });
    return response as SessionType;
  };
  const updateSession = async ({
    id,
    newData,
  }: {
    id: string;
    newData: RequestSessionType;
  }) => {
    const response = await apiFetch('/api/sessions', {
      method: 'PUT',
      data: { id, newData },
    });
    return response as SessionType;
  };
  const deleteSession = async (id: string) => {
    const response = await apiFetch('/api/sessions', {
      method: 'DELETE',
      data: { id },
    });
    return response as void;
  };
  return { createSession, updateSession, deleteSession, getSession };
}
