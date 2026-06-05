import { create } from 'zustand';
import { SystemPromptOption } from '../types/systemPromptType';

interface SystemPromptState {
  systemPrompt: SystemPromptOption;
  setSystemPrompt: (prompt: SystemPromptOption) => void;
}

export const useSystemPrompt = create<SystemPromptState>((set) => ({
  systemPrompt: {
    id: '0',
    description: '默认配置：无系统提示词',
    content: '',
  },
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
}));
