import { SystemPromptOption } from './SystemPromptType';
import { UIMessage } from 'ai';

export interface SessionType {
  id: string; // 会话ID
  title: string;
  temperature: number;
  systemPrompt: SystemPromptOption;
  userId: string; // 用户ID
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
  messages: UIMessage[]; // 消息列表
}

export interface RequestSessionType {
  userId?: string;
  title?: string;
  temperature?: number;
  systemPrompt?: SystemPromptOption;
}

export interface MessageType {
  id: string; // 消息ID
  parts: JSON[]; // 消息内容
  role: string; // 消息角色
  sessionId: string; // 会话ID
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
}

export interface RequestMessageType {
  id: string; // 消息ID（前端生成）
  parts: object[]; // 消息内容
  role: string; // 消息角色
}
