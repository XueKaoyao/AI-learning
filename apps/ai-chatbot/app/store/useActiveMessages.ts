import { create } from 'zustand';
import type { UIMessage } from 'ai';

interface ActiveMessagesState {
  messages: UIMessage[];
  setActiveMessages: (messages: UIMessage[]) => void;
}

/** 当前聊天页消息快照，供布局层 Header 导出使用 */
export const useActiveMessages = create<ActiveMessagesState>((set) => ({
  messages: [],
  setActiveMessages: (messages) => set({ messages }),
}));
