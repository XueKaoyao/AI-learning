'use client';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ConversationsProps } from '@ant-design/x';
import { Conversations } from '@ant-design/x';
import type { GetProp } from 'antd';
import { Input } from 'antd';
import { useSessionList } from '../store/useSessionList';
import { deleteSessionMessages } from '../store/useMessageHistory';
import { useState } from 'react';
import { useSystemOption } from '../store/useSystemOption';

export default function Sider() {
  const { currentSessionId, setCurrentSessionId, sessionList, setSessionList } =
    useSessionList();
  const { initialPrompt } = useSystemOption();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSaveRename = (id: number) => {
    const target = sessionList.find((v) => v.id === id);
    if (!target) return;
    const trimmed =
      editTitle.trim().length > 20
        ? `${editTitle.trim().substring(0, 20)}...`
        : editTitle.trim();
    // 空标题不允许保存，直接取消编辑
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const newList = sessionList.filter((v) => v.id !== id);
    if (target.title !== trimmed) {
      setSessionList([{ ...target, title: trimmed }, ...newList]);
    }
    setEditingId(null);
  };

  const items: GetProp<ConversationsProps, 'items'> = sessionList.map(
    (session) => ({
      key: `${session.id}`,
      label:
        editingId === session.id ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onPressEnter={() => handleSaveRename(session.id)}
            onBlur={() => handleSaveRename(session.id)}
            onClick={(e) => e.stopPropagation()}
            size="small"
            autoFocus
            styles={{
              root: {
                backgroundColor: 'transparent',
                border: '0px',
                color: 'var(--color-font)',
              },
            }}
          />
        ) : (
          session.title
        ),
    }),
  );

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: 'Rename',
        key: 'Rename',
        icon: <EditOutlined />,
        onClick: () => {
          const id = +conversation.key;
          setEditingId(id);
          setEditTitle(sessionList.find((s) => s.id === id)?.title || '');
        },
      },
      {
        label: 'Delete Chat',
        key: 'deleteChat',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          const deletedId = +conversation.key;
          const newSessionList = sessionList.filter((v) => v.id !== deletedId);
          setSessionList(newSessionList);
          deleteSessionMessages(deletedId);
          if (currentSessionId === deletedId) {
            setCurrentSessionId(null);
            initialPrompt();
          }
        },
      },
    ],
  });

  const newChatClick = () => {
    setCurrentSessionId(null);
    initialPrompt();
  };

  return (
    <Conversations
      menu={menuConfig}
      items={items}
      className="sider-conversations"
      creation={{
        onClick: newChatClick,
      }}
      activeKey={String(currentSessionId)}
      onActiveChange={(v) => setCurrentSessionId(+v)}
      styles={{
        root: {
          backgroundColor: 'var(--color-primary)',
          borderRight: '1px solid var(--color-secondary)',
          height: '100%',
        },
        item: {
          borderRadius: 50,
          marginBottom: 5,
          padding: '8px 15px',
        },
        creation: {
          backgroundColor: 'var(--color-default)',
          borderColor: 'var(--color-third)',
          color: 'var(--color-font)',
          marginBottom: 10,
          marginTop: 8,
        },
      }}
    />
  );
}
