import { create } from 'zustand';

interface ChatState {
  input: string;
  lastSubmittedInput: string;
  setInput: (value: string) => void;
  submitInput: () => void;
}

export const useChatInput = create<ChatState>((set) => ({
  input: '',
  lastSubmittedInput: '',
  setInput: (value) => set({ input: value }),
  submitInput: () =>
    set((state) => ({
      lastSubmittedInput: state.input,
      input: '',
    })),
}));
