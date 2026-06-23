import { renderHook, act } from '@testing-library/react';
import { UIMessage } from 'ai';
import { SessionType } from '../../types/sessionManage';

// Define mock objects BEFORE jest.mock (jest.mock factory is hoisted and
// uses these references; they're closed over, not accessed at execution)
const mockMessage = {
  error: jest.fn(),
  success: jest.fn(),
};

const mockSetMessageHistory = jest.fn().mockResolvedValue(undefined);

const mockSetCurrentSessionId = jest.fn();
const mockSetSessionList = jest.fn();
let mockCurrentSessionId: number | null = 1;
let mockSessionList: SessionType[] = [];

jest.mock('antd', () => ({
  message: mockMessage,
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'mock-nanoid-12345678',
}));

jest.mock('../../store/useMessageHistory', () => ({
  setMessageHistory: (...args: unknown[]) => mockSetMessageHistory(...args),
}));

jest.mock('../../store/useSessionList', () => ({
  useSessionList: () => ({
    currentSessionId: mockCurrentSessionId,
    setCurrentSessionId: mockSetCurrentSessionId,
    sessionList: mockSessionList,
    setSessionList: mockSetSessionList,
  }),
}));

import useHandleFiles from '../useHandleFiles';

function createMockMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
    createdAt: new Date(),
  } as UIMessage;
}

function createMockSession(id: number, title: string): SessionType {
  return {
    id,
    title,
    temperature: 0.8,
    systemPrompt: { id: '0', description: '', content: '' },
  };
}

describe('useHandleFiles', () => {
  beforeEach(() => {
    mockCurrentSessionId = 1;
    mockSessionList = [createMockSession(1, 'Test Chat')];
    mockMessage.error.mockClear();
    mockMessage.success.mockClear();
    mockSetMessageHistory.mockClear();
    mockSetCurrentSessionId.mockClear();
    mockSetSessionList.mockClear();
    jest.clearAllMocks();
  });

  describe('exportChat', () => {
    it('shows error when no session is selected', () => {
      mockCurrentSessionId = null;

      const { result } = renderHook(() => useHandleFiles());

      let returnedValue: boolean = true;
      act(() => {
        returnedValue = result.current.exportChat([]);
      });

      expect(mockMessage.error).toHaveBeenCalledWith('请选择要导出的会话！');
      expect(returnedValue).toBe(false);
    });

    it('creates a downloadable JSON blob for the current session', () => {
      const messages = [createMockMessage('1', 'user', 'Hello')];

      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      const { result } = renderHook(() => useHandleFiles());

      let returnedValue: boolean = false;
      act(() => {
        returnedValue = result.current.exportChat(messages);
      });

      expect(returnedValue).toBe(true);
      expect(mockMessage.success).toHaveBeenCalledWith('导出成功!');
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('includes session metadata and messages in exported JSON', () => {
      const messages = [createMockMessage('1', 'user', 'Hello')];

      const { result } = renderHook(() => useHandleFiles());

      let blob: Blob | null = null;
      const originalBlob = global.Blob;
      jest
        .spyOn(global, 'Blob')
        .mockImplementationOnce(
          (parts: BlobPart[], options?: BlobPropertyBag) => {
            blob = new originalBlob(parts, options);
            return blob;
          },
        );

      act(() => {
        result.current.exportChat(messages);
      });

      expect(blob).not.toBeNull();
      expect(blob?.type).toBe('application/json');
    });

    it('handles JSON.stringify errors gracefully', () => {
      const badMessages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'test' }],
        } as UIMessage,
      ];
      (badMessages[0] as Record<string, unknown>).circular = badMessages;

      const { result } = renderHook(() => useHandleFiles());

      let returnedValue: boolean = true;
      act(() => {
        returnedValue = result.current.exportChat(badMessages);
      });

      expect(returnedValue).toBe(false);
      expect(mockMessage.error).toHaveBeenCalled();
    });
  });

  describe('importChat', () => {
    it('reads a JSON file and imports chat data', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const importData = {
        meta: createMockSession(999, 'Imported Chat'),
        messages: [createMockMessage('old-1', 'user', 'Imported message')],
      };

      const file = new File(
        [JSON.stringify(importData)],
        'Imported Chat.json',
        { type: 'application/json' },
      );

      const { result } = renderHook(() => useHandleFiles());

      act(() => {
        result.current.importChat(file);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSetMessageHistory).toHaveBeenCalled();
      expect(mockSetSessionList).toHaveBeenCalled();
      expect(mockSetCurrentSessionId).toHaveBeenCalledWith(now);
      expect(mockMessage.success).toHaveBeenCalledWith('导入成功');
    });

    it('shows error for invalid JSON file', async () => {
      const file = new File(['not valid json{{{'], 'bad.json', {
        type: 'application/json',
      });

      const { result } = renderHook(() => useHandleFiles());

      act(() => {
        result.current.importChat(file);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMessage.error).toHaveBeenCalledWith(
        '文件格式错误，请上传正确的JSON文件!',
      );
    });

    it('shows error when file reading fails', async () => {
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        result: '{}',
        DONE: 2,
        EMPTY: 0,
        LOADING: 1,
        readyState: 2,
      };

      jest
        .spyOn(global, 'FileReader')
        .mockImplementation(() => mockFileReader as unknown as FileReader);

      const file = new File(['{}'], 'test.json', { type: 'application/json' });

      const { result } = renderHook(() => useHandleFiles());

      act(() => {
        result.current.importChat(file);
      });

      act(() => {
        mockFileReader.onerror?.();
      });

      expect(mockMessage.error).toHaveBeenCalledWith('文件读取失败，请重试！');

      jest.restoreAllMocks();
    });
  });
});
