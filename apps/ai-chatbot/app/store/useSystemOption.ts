import { create } from 'zustand';
import { SystemPromptOption } from '../types/systemPromptType';

interface SystemOptionState {
  temperature: number;
  setTemperature: (temp: number) => void;
  systemPrompt: SystemPromptOption;
  setSystemPrompt: (prompt: SystemPromptOption) => void;
  initialPrompt: () => void;
}

export const useSystemOption = create<SystemOptionState>((set) => ({
  temperature: 0.8,
  setTemperature: (temp) => set({ temperature: temp }),
  systemPrompt: {
    id: '0',
    description: '默认配置：无系统提示词',
    content: '',
  },
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  initialPrompt: () =>
    set({
      temperature: 0.8,
      systemPrompt: {
        id: '0',
        description: '默认配置：无系统提示词',
        content: '',
      },
    }),
}));
