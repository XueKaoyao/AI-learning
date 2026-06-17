import { UIMessage } from 'ai';
import { message } from 'antd';
import { setMessageHistory } from '../store/useMessageHistory';
import { useSessionList } from '../store/useSessionList';
import { SessionType } from '../types/sessionManage';
import { nanoid } from 'nanoid';

interface HandleFilesType {
  exportChat: (messages: UIMessage[]) => boolean;
  importChat: (file: File) => void;
}

interface FileType {
  meta: SessionType;
  messages: UIMessage[];
}

export default function useHandleFiles(): HandleFilesType {
  const { currentSessionId, setCurrentSessionId, sessionList, setSessionList } =
    useSessionList();
  const exportChat = (messages: UIMessage[]): boolean => {
    if (currentSessionId === null) {
      message.error('请选择要导出的会话！');
      return false;
    }
    const meta = sessionList.find((v) => v.id === currentSessionId);
    try {
      const jsonStr = JSON.stringify({ meta, messages }, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meta?.title}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('导出成功!');
      return true;
    } catch (error) {
      message.error('导出失败:' + error);
      return false;
    }
  };

  const importChat = (file: File) => {
    const reader = new FileReader();

    reader.readAsText(file);

    reader.onload = async (e) => {
      try {
        const jsonData: FileType = JSON.parse(e.target?.result as string);
        const meta = jsonData.meta;
        const updatedData: UIMessage[] = jsonData.messages.map(
          (v: UIMessage) => ({
            ...v,
            id: nanoid(16),
          }),
        );
        const now = Date.now();
        await setMessageHistory(updatedData, now);
        setSessionList([
          {
            id: now,
            title: file.name.split('.')[0] || 'New Chat',
            temperature: meta.temperature,
            systemPrompt: meta.systemPrompt,
          },
          ...sessionList,
        ]);
        setCurrentSessionId(now);
        message.success('导入成功');
      } catch {
        message.error('文件格式错误，请上传正确的JSON文件!');
      }
    };

    reader.onerror = () => {
      message.error('文件读取失败，请重试！');
    };
  };
  return {
    exportChat,
    importChat,
  };
}
