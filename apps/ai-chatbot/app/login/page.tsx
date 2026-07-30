'use client';

import {
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Tabs,
  Typography,
} from 'antd';
import {
  LockOutlined,
  MailOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import useUserCrud from '../hooks/useUserCrud';
import { RegisterInput, LoginInput } from '../types/LoginInfoType';
import useMessageComponent from '../hooks/useMessageComponent';
import { useRouter } from 'next/navigation';

const { Title, Link } = Typography;

const fieldStyle = {
  root: {
    backgroundColor: 'var(--color-default)',
    borderColor: 'var(--color-third)',
    color: 'var(--color-font)',
  },
  prefix: {
    color: 'var(--color-font)',
  },
};

const passwordInputClassNames = {
  root: 'login-password-input',
  input: 'login-input',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SameFormItems({ tab }: { tab: 'login' | 'register' }) {
  return (
    <>
      <Form.Item label="邮箱" name="email">
        <Input
          classNames={{ input: 'login-input' }}
          size="middle"
          prefix={<MailOutlined />}
          placeholder="请输入邮箱"
          styles={fieldStyle}
        />
      </Form.Item>
      <Form.Item label="密码" name="password">
        <Input.Password
          classNames={passwordInputClassNames}
          size="middle"
          prefix={<LockOutlined />}
          placeholder={tab === 'login' ? '请输入密码' : '至少 8 位密码'}
          styles={fieldStyle}
        />
      </Form.Item>
    </>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const { register, login, loading } = useUserCrud();
  const { successFn, errorFn, contextHolder } = useMessageComponent();
  const router = useRouter();

  const validateEmail = (email: string) => {
    if (!EMAIL_RE.test(email)) {
      errorFn('邮箱格式不正确!');
      return false;
    }
    return true;
  };

  const handleLogin = async (values: LoginInput) => {
    try {
      if (!values.email || !values.password) {
        errorFn('请输入邮箱和密码!');
        return;
      }
      if (values.password.length < 8) {
        errorFn('密码长度至少为 8 位!');
        return;
      }
      if (!validateEmail(values.email)) {
        return;
      }
      await login(values);
      router.push('/');
      successFn('登录成功!');
    } catch (error) {
      errorFn(`${error instanceof Error ? error.message : '登录失败!'}`);
    }
  };

  const handleRegister = async (values: RegisterInput) => {
    try {
      if (!values.name || !values.email || !values.password) {
        errorFn('请输入用户名、邮箱和密码!');
        return;
      }
      if (values.password.length < 8) {
        errorFn('密码长度至少为 8 位!');
        return;
      }
      if (!validateEmail(values.email)) {
        return;
      }
      await register(values);
      setTab('login');
      successFn('注册成功!');
    } catch (error) {
      errorFn(`${error instanceof Error ? error.message : '注册失败!'}`);
    }
  };

  return (
    <>
      {contextHolder}
      <Flex
        align="center"
        justify="center"
        className="h-full bg-[var(--color-primary)]"
      >
        <Card
          style={{
            width: 400,
            backgroundColor: 'var(--color-default)',
            borderColor: 'var(--color-border)',
          }}
          styles={{ body: { padding: 32 } }}
        >
          <Flex vertical align="center" gap="small" className="mb-6">
            <RobotOutlined
              style={{ fontSize: 40, color: 'var(--color-font)' }}
            />
            <Title level={3} style={{ margin: 0, color: 'var(--color-font)' }}>
              AI Chatbot
            </Title>
          </Flex>

          <Tabs
            centered
            styles={{
              item: {
                color: 'var(--color-font)',
              },
            }}
            onChange={(key) => setTab(key as 'login' | 'register')}
            activeKey={tab}
            items={[
              {
                key: 'login',
                label: '登录',
                children: (
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    styles={{
                      label: {
                        color: 'var(--color-font)',
                      },
                    }}
                    onFinish={(values) => {
                      handleLogin(values as LoginInput);
                    }}
                  >
                    <SameFormItems tab={tab} />
                    <Form.Item>
                      <Flex justify="space-between" align="center">
                        <Checkbox
                          styles={{ root: { color: 'var(--color-font)' } }}
                        >
                          记住我
                        </Checkbox>
                        <Link>忘记密码？</Link>
                      </Flex>
                    </Form.Item>
                    <Form.Item>
                      <Button
                        loading={loading}
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: '注册',
                children: (
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    styles={{
                      label: {
                        color: 'var(--color-font)',
                      },
                    }}
                    onFinish={(values) => {
                      handleRegister(values as RegisterInput);
                    }}
                  >
                    <Form.Item label="用户名" name="name">
                      <Input
                        classNames={{ input: 'login-input' }}
                        size="middle"
                        prefix={<UserOutlined />}
                        placeholder="请输入用户名"
                        styles={fieldStyle}
                      />
                    </Form.Item>
                    <SameFormItems tab={tab} />
                    <Form.Item>
                      <Button
                        loading={loading}
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
      </Flex>
    </>
  );
}
