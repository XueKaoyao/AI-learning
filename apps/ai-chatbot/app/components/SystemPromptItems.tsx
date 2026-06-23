import { Button, Card, Input, message, Popconfirm, Radio } from 'antd';
import { useState, useRef, useEffect } from 'react';
import { useSystemOption } from '../store/useSystemOption';
import { SystemPromptOption } from '../types/systemPromptType';
import useFetchPrompts from '../hooks/useFetchPrompts';
import {
  addCustomPrompt,
  deleteCustomPrompt,
  updateCustomPrompt,
} from '../store/useCustomPrompts';
import throttle from 'lodash/throttle';
import { nanoid } from 'nanoid';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

export default function SystemPromptItems({
  setPendingSystemPrompt,
}: {
  setPendingSystemPrompt: (prompt: SystemPromptOption) => void;
}) {
  const { systemPrompt } = useSystemOption();
  const { results, setResults } = useFetchPrompts();
  const [selectedValue, setSelectedValue] = useState<string>(systemPrompt.id);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const throttledSelectRef = useRef<ReturnType<typeof throttle> | null>(null);

  if (throttledSelectRef.current === null) {
    throttledSelectRef.current = throttle(
      (option: SystemPromptOption) => setPendingSystemPrompt(option),
      1000,
    );
  }

  const addFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => throttledSelectRef.current?.cancel();
  }, []);

  const handleCancel = () => {
    setNewDesc('');
    setNewContent('');
    setIsAdding(false);
    setEditingId(null);
    setSelectedValue(systemPrompt.id);
  };

  const handleSave = async () => {
    const desc = newDesc.trim();
    const content = newContent.trim();
    if (!desc || !content) return;

    if (editingId) {
      // 编辑现有提示词：原地更新，保持 id 不变
      const updated: SystemPromptOption = {
        id: editingId,
        description: desc,
        content,
        tag: 'custom',
      };
      await updateCustomPrompt(editingId, {
        description: desc,
        content,
      });
      setResults((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      throttledSelectRef.current?.(updated);
      setSelectedValue(editingId);
    } else {
      // 新增提示词
      const id = nanoid(16);
      const newPrompt: SystemPromptOption = {
        id,
        description: desc,
        content,
        tag: 'custom',
      };
      await addCustomPrompt(newPrompt);
      setResults((prev) => [...prev, newPrompt]);
      throttledSelectRef.current?.(newPrompt);
      setSelectedValue(id);
    }

    setNewDesc('');
    setNewContent('');
    setIsAdding(false);
    setEditingId(null);
  };

  // 新增表单出现时自动滚动到顶部
  useEffect(() => {
    if (isAdding && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isAdding]);

  return (
    <Radio.Group
      value={selectedValue}
      onChange={(e) => setSelectedValue(e.target.value)}
    >
      {isAdding ? (
        <div ref={addFormRef}>
          <Card
            styles={{
              root: {
                margin: 15,
                border:
                  selectedValue === String(results.length)
                    ? '1px solid #3b82f6'
                    : '1px solid #e5e7eb',
              },
              body: { padding: 16 },
            }}
          >
            <Radio
              value={editingId === null ? String(results.length) : editingId}
              className="mb-3"
              styles={{ root: { padding: 0 } }}
            >
              自定义提示词
            </Radio>
            <div className="flex flex-col gap-3 mt-2">
              <Input
                placeholder="提示词描述（如：专业翻译助手）"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <Input.TextArea
                placeholder="提示词内容（如：你是一个专业的翻译助手...）"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button onClick={handleCancel}>取消</Button>
                <Button type="primary" onClick={handleSave}>
                  保存
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card
          onClick={() => {
            setEditingId(null);
            setNewDesc('');
            setNewContent('');
            setIsAdding(true);
            setSelectedValue(String(results.length));
          }}
          styles={{
            root: {
              margin: 15,
              backgroundColor: '#3b82f6',
              cursor: 'pointer',
            },
            body: {
              padding: 10,
              display: 'flex',
              justifyContent: 'center',
              color: '#FFFFFF',
            },
          }}
        >
          新增提示词
        </Card>
      )}
      {results
        .filter((option) => !(isAdding && editingId === option.id))
        .map((option) => {
          const isSelected = selectedValue === option.id;
          return (
            <Card
              key={option.id}
              hoverable
              onClick={() => {
                setSelectedValue(option.id);
                setIsAdding(false);
                setEditingId(null);
                throttledSelectRef.current?.(option);
              }}
              styles={{
                root: {
                  margin: 15,
                  border: isSelected
                    ? '1px solid #3b82f6'
                    : '1px solid #e5e7eb',
                },
                body: {
                  padding: 0,
                },
              }}
            >
              <div className="flex flex-row items-center">
                <Radio
                  value={option.id}
                  className="w-full"
                  styles={{ root: { padding: '20px' } }}
                >
                  {option.description}
                </Radio>
                {option?.tag === 'custom' && (
                  <div
                    className="flex flex-row gap-3 mr-5"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <EditOutlined
                      style={{
                        color: '#9CA3AF',
                        fontSize: '18px',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewDesc(option.description);
                        setNewContent(option.content);
                        setEditingId(option.id);
                        setIsAdding(true);
                        setSelectedValue(option.id);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#4472ef')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = '#9CA3AF')
                      }
                    />
                    <Popconfirm
                      title="删除提示词"
                      description="你确定要删除当前提示词吗?"
                      onConfirm={() => {
                        if (selectedValue === option.id) setSelectedValue('0');
                        deleteCustomPrompt(option.id);
                        setResults(
                          results.filter((result) => result.id !== option.id),
                        );
                        message.success('删除成功！');
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确定"
                      cancelText="取消"
                      styles={{ container: { padding: '20px' } }}
                    >
                      <DeleteOutlined
                        style={{
                          color: '#9CA3AF',
                          fontSize: '18px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = '#EF4444')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = '#9CA3AF')
                        }
                      />
                    </Popconfirm>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
    </Radio.Group>
  );
}
