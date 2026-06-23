'use client';
import { memo } from 'react';
import { Button, Switch, Upload } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../store/useThemeStore';

interface HeaderProps {
  onImport: (file: File) => void;
  onExport: () => void;
}

function Header({ onImport, onExport }: HeaderProps) {
  const { theme, setTheme } = useThemeStore();

  return (
    <header className="shrink-0 flex items-center border-b border-secondary px-4 py-5 bg-primary">
      <span className="font-semibold text-lg mx-auto text-[var(--color-font)]">
        AI Chatbot
      </span>
      <div className="flex justify-center items-center gap-5">
        <Upload accept=".json" beforeUpload={onImport} showUploadList={false}>
          <Button
            icon={<ImportOutlined />}
            styles={{
              root: {
                backgroundColor: 'var(--color-default)',
                border: '1px solid var(--color-third)',
                color: 'var(--color-font)',
              },
            }}
          >
            导入会话
          </Button>
        </Upload>
        <Button
          icon={<ExportOutlined />}
          styles={{
            root: {
              backgroundColor: 'var(--color-default)',
              border: '1px solid var(--color-third)',
              color: 'var(--color-font)',
            },
          }}
          onClick={onExport}
        >
          导出会话
        </Button>
        <Switch
          checked={theme === 'dark'}
          onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </div>
    </header>
  );
}

export default memo(Header);
