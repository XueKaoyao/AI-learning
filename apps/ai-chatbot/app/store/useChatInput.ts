import { create } from 'zustand';

interface ChatState {
  input: string;
  setInput: (value: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  input: '',
  setInput: (value) => set({ input: value }),
}));
