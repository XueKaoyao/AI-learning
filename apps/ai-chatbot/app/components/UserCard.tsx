'use client';

import { memo } from 'react';
import { Avatar, Button, Divider } from 'antd';
import { LogoutOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import type { AuthUser } from '../store/useUserStore';
import useUserCrud from '../hooks/useUserCrud';

interface UserCardProps {
  user: AuthUser;
}

function formatJoinedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function UserCard({ user }: UserCardProps) {
  const { logout } = useUserCrud();
  return (
    <div className="w-64 p-4">
      <div className="flex items-center gap-3">
        <Avatar
          size={48}
          icon={<UserOutlined />}
          style={{
            backgroundColor: 'var(--color-default)',
            border: '1px solid var(--color-third)',
            color: 'var(--color-font)',
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--color-font)]">
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-placeholder)]">
            加入于 {formatJoinedAt(user.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-default)] px-3 py-2">
        <MailOutlined style={{ color: 'var(--color-placeholder)' }} />
        <span className="truncate text-sm text-[var(--color-font)]">
          {user.email}
        </span>
      </div>

      <Divider className="!my-4 !border-[var(--color-border)]" />

      <Button
        block
        danger
        icon={<LogoutOutlined />}
        className="user-card-logout"
        styles={{
          root: {
            backgroundColor: 'var(--color-default)',
            border: '1px solid var(--color-third)',
            color: 'var(--error-text)',
          },
        }}
        onClick={logout}
      >
        退出登录
      </Button>
    </div>
  );
}

export default memo(UserCard);
