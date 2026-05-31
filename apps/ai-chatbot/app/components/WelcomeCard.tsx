'use client';
import { Welcome } from '@ant-design/x';
import PromptCards from './PromptCards';
import { Image } from 'antd';
import { useThemeStore } from '../store/useThemeStore';

const WelcomeCard = () => {
  const { theme } = useThemeStore();
  return (
    <div className="w-2/3 m-auto">
      <Welcome
        style={{
          backgroundImage: `${theme === 'dark' ? 'linear-gradient(97deg, #1a1a2e 0%, #2d1b4e 100%)' : 'linear-gradient(97deg, #f2f9fe 0%, #f7f3ff 100%)'}`,
          border: '1px solid var(--color-default)',
          borderRadius: 10,
        }}
        description={
          <div className="flex flex-row justify-content gap-4 p-4">
            <Image
              alt="ai assistant"
              preview={false}
              width={50}
              src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            />
            <div className="flex w-full min-w-0 flex-col overflow-hidden pr-3">
              <p className="text-2xl font-bold mt-1 mb-2! text-[var(--color-font)]">
                你好，欢迎使用AI Chatbot！
              </p>
              <p className="text-base font-normal text-[var(--color-font)]">
                有什么问题都可以来问我哦~
              </p>
              <PromptCards />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default WelcomeCard;
