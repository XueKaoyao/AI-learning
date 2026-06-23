import { create } from 'zustand';
import { SessionType } from '../types/sessionManage';

interface SessionListState {
  currentSessionId: number | null;
  setCurrentSessionId: (id: number | null) => void;
  sessionList: SessionType[];
  setSessionList: (list: SessionType[]) => void;
  hydrateFromStorage: () => void;
}

export const useSessionList = create<SessionListState>((set) => ({
  currentSessionId: null,
  setCurrentSessionId: (id: number | null) => set({ currentSessionId: id }),
  sessionList: [],
  setSessionList: (list: SessionType[]) => {
    set({ sessionList: list });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionList', JSON.stringify(list));
    }
  },
  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('sessionList');
    if (stored) {
      set({ sessionList: JSON.parse(stored) });
    }
  },
}));
