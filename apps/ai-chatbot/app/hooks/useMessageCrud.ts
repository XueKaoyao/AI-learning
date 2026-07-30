// 新方案使用postgresql存储消息历史
import { useCallback } from 'react';
import { apiFetch } from '@myworkspace/fetch';
import { MessageType, RequestMessageType } from '../types/SessionManageType';
import { UIMessage } from 'ai';

interface MessageCrudState {
  getMessages: (sessionId: string | null) => Promise<UIMessage[]>;
  createMessage: ({
    sessionId,
    message,
    messages,
  }: {
    sessionId: string | null;
    message?: RequestMessageType;
    messages?: RequestMessageType[];
  }) => Promise<MessageType | MessageType[]>;
  updateMessage: ({
    sessionId,
    message,
  }: {
    sessionId: string | null;
    message: RequestMessageType;
  }) => Promise<MessageType>;
  deleteMessage: ({
    sessionId,
    messageId,
  }: {
    sessionId: string | null;
    messageId: string;
  }) => Promise<void>;
}

export default function useMessageCrud(): MessageCrudState {
  const getMessages = useCallback(async (sessionId: string | null) => {
    // 对齐 loadMessageHistory(null) → []
    if (sessionId === null) return [];
    const response = await apiFetch<{ messages: UIMessage[] }>(
      `/api/sessions/${sessionId}`,
      {
        cacheConfig: { ttl: 0 },
      },
    );
    return response.messages;
  }, []);

  const createMessage = useCallback(
    async ({
      sessionId,
      message,
      messages,
    }: {
      sessionId: string | null;
      message?: RequestMessageType;
      messages?: RequestMessageType[];
    }) => {
      const response = await apiFetch(`/api/sessions/${sessionId}`, {
        method: 'POST',
        data: messages ? { messages } : message,
      });
      return response as MessageType | MessageType[];
    },
    [],
  );

  const updateMessage = useCallback(
    async ({
      sessionId,
      message,
    }: {
      sessionId: string | null;
      message: RequestMessageType;
    }) => {
      const response = await apiFetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        data: message,
      });
      return response as MessageType;
    },
    [],
  );

  const deleteMessage = useCallback(
    async ({
      sessionId,
      messageId,
    }: {
      sessionId: string | null;
      messageId: string;
    }) => {
      const response = await apiFetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        data: { messageId },
      });
      return response as void;
    },
    [],
  );

  return {
    getMessages,
    createMessage,
    updateMessage,
    deleteMessage,
  };
}
