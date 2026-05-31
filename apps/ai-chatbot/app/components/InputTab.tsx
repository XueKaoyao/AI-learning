'use client';
import { SettingOutlined } from '@ant-design/icons';
import { Sender } from '@ant-design/x';
import { Button, Modal, Tooltip, Slider } from 'antd';
import { useState } from 'react';
import SystemPromptItems from './SystemPromptItems';
import { useSystemPrompt } from '../store/useSystemprompt';
import { SystemPromptOption } from '../types/systemPromptType';
import { useThemeStore } from '../store/useThemeStore';
import { useChatStore } from '../store/useChatInput';

export default function InputTab({
  sendMessage,
  stop,
  status,
}: {
  sendMessage: (
    message: { text: string },
    options?: { body?: Record<string, unknown> },
  ) => void;
  stop: () => void;
  status: string;
}) {
  const [temperature, setTemperature] = useState<number>(0.8);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState<boolean>(false);
  const { input, setInput } = useChatStore();
  const { systemPrompt, setSystemPrompt } = useSystemPrompt();
  const { theme } = useThemeStore();
  const [pendingSystemPrompt, setPendingSystemPrompt] =
    useState<SystemPromptOption>(systemPrompt);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (message: string) => {
    const text = message.trim();
    if (!text || isLoading) return;
    sendMessage(
      { text },
      { body: { temperature, systemPrompt: systemPrompt.content } },
    );
    setInput('');
  };

  const handleCancel = () => {
    stop();
  };

  const handleTemperatureChange = (value: number) => {
    setTemperature(value);
  };
  return (
    <div className="w-2/3 m-auto">
      <Sender
        onSubmit={(v) => handleSubmit(v)}
        value={input}
        loading={isLoading}
        onChange={setInput}
        placeholder="输入你的问题..."
        allowSpeech={true}
        onCancel={handleCancel}
        suffix={false}
        classNames={{ input: 'sender-input' }}
        styles={{
          root: {
            background: `var(--color-${theme === 'dark' ? 'secondary' : 'major'})`,
            borderColor: `var(--color-${theme === 'dark' ? 'default' : 'secondary'})`,
          },
          input: {
            color: `var(--color-font)`,
          },
        }}
        footer={(_, { components }) => {
          const { SendButton, LoadingButton, SpeechButton } = components;
          return (
            <div className="w-full flex justify-between items-center">
              <div className="flex justify-center items-center gap-2">
                <Tooltip
                  placement="top"
                  styles={{ container: { backgroundColor: '#fff' } }}
                  arrow={false}
                  title={
                    <div
                      className="flex items-center gap-3 px-2"
                      style={{ minWidth: 100 }}
                    >
                      <Slider
                        className="flex-1"
                        min={0}
                        max={1}
                        onChange={handleTemperatureChange}
                        value={temperature}
                        step={0.01}
                        styles={{
                          rail: { backgroundColor: '#919191' },
                          track: { backgroundColor: '#1890ff' },
                          handle: { borderColor: '#1890ff' },
                        }}
                      />
                    </div>
                  }
                >
                  <Button
                    size="middle"
                    styles={{
                      root: {
                        backgroundColor: `var(--color-${theme === 'dark' ? 'secondary' : 'major'})`,
                        borderColor: `var(--color-${theme === 'dark' ? 'default' : 'secondary'})`,
                        color: `var(--color-font)`,
                      },
                    }}
                  >
                    Temperature
                  </Button>
                </Tooltip>
                <Button
                  icon={<SettingOutlined />}
                  size="middle"
                  styles={{
                    root: {
                      backgroundColor: `var(--color-${theme === 'dark' ? 'secondary' : 'major'})`,
                      borderColor: `var(--color-${theme === 'dark' ? 'default' : 'secondary'})`,
                      color: `var(--color-font)`,
                    },
                  }}
                  onClick={() => {
                    setIsSystemPromptOpen(true);
                  }}
                >
                  System Prompt
                </Button>
              </div>
              <div className="flex gap-2">
                <SpeechButton
                  styles={{
                    root: {
                      color: `var(--color-font)`,
                    },
                  }}
                />
                {isLoading ? (
                  <LoadingButton type="default" />
                ) : (
                  <SendButton type="primary" disabled={false} />
                )}
              </div>
            </div>
          );
        }}
      />
      <Modal
        title="System Prompt"
        open={isSystemPromptOpen}
        destroyOnHidden
        onCancel={() => setIsSystemPromptOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsSystemPromptOpen(false)}>取消</Button>
            <Button
              type="primary"
              onClick={() => {
                setSystemPrompt(pendingSystemPrompt);
                setIsSystemPromptOpen(false);
              }}
            >
              保存
            </Button>
          </div>
        }
        classNames={{ body: 'scrollbar-none' }}
        styles={{
          body: {
            height: 300,
            overflow: 'auto',
            marginTop: 20,
            marginBottom: 20,
          },
        }}
      >
        <SystemPromptItems setPendingSystemPrompt={setPendingSystemPrompt} />
      </Modal>
    </div>
  );
}
