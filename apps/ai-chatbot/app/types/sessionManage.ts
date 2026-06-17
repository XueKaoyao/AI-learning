import { SystemPromptOption } from '../types/systemPromptType';

export interface SessionType {
  id: number; // 会话创建时间
  title: string;
  temperature: number;
  systemPrompt: SystemPromptOption;
}
