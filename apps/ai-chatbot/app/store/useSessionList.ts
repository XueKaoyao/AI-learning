import { create } from 'zustand';
import { SessionType } from '../types/SessionManageType';
import { apiFetch } from '@myworkspace/fetch';

interface SessionListState {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  sessionList: SessionType[];
  fetchSessionList: (userId: string) => Promise<void>;
}

export const useSessionList = create<SessionListState>((set) => {
  return {
    currentSessionId: null,
    setCurrentSessionId: (id: string | null) => set({ currentSessionId: id }),
    sessionList: [],
    fetchSessionList: async (userId: string) => {
      try {
        if (!userId) throw new Error('请先登录！');
        const response = await apiFetch(`/api/sessions?userId=${userId}`, {
          cacheConfig: { ttl: 0 },
        });
        const sessions = (response as SessionType[]).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        set({ sessionList: sessions });
      } catch (error) {
        console.error(error);
      }
    },
  };
});
