'use client';
import type { PromptsProps } from '@ant-design/x';
import { Prompts } from '@ant-design/x';
import { Space, Image } from 'antd';
import { useThemeStore } from '../store/useThemeStore';
import { useChatStore } from '../store/useChatInput';
import useFetchPrompts from '../hooks/useFetchPrompts';
import { useSystemPrompt } from '../store/useSystemprompt';

const renderTitle = (url: string, title: string, width: number) => (
  <Space align="start">
    <Image src={url} alt={title} preview={false} width={width} />
    <span className="text-[var(--color-font)]">{title}</span>
  </Space>
);

const items: PromptsProps['items'] = [
  {
    key: '1',
    label: renderTitle('/cooker.svg', '资深专业主厨', 20),
    description: '有什么烹饪问题都可以来问我~',
    children: [
      {
        key: '1-1',
        description: `怎么做麻婆豆腐？要详细步骤和用时`,
      },
      {
        key: '1-2',
        description: `炒肉丝总是又老又柴，哪里出问题了？`,
      },
      {
        key: '1-3',
        description: `糖醋排骨的糖色怎么炒才不苦？`,
      },
    ],
  },
  {
    key: '2',
    label: renderTitle('/programmer.svg', '资深开发工程师', 20),
    description: '技术问题尽管抛过来~',
    children: [
      {
        key: '2-1',
        description: `什么是闭包？给定义和代码示例`,
      },
      {
        key: '2-2',
        description: `Python 列表推导式和 map 哪个更快？`,
      },
      {
        key: '2-3',
        description: `防抖和节流的区别，各给一段代码`,
      },
    ],
  },
  {
    key: '3',
    label: renderTitle('/poet.svg', '古典诗人', 20),
    description: '今夜有诗，你若有情绪，我便替你写成行。',
    children: [
      {
        key: '3-1',
        description: `我很清醒但不想动，写一首失眠的诗`,
      },
      {
        key: '3-2',
        description: `用一句话形容秋天像什么`,
      },

      {
        key: '3-3',
        description: `把失恋比作一种天气，写四行诗`,
      },
    ],
  },
  {
    key: '4',
    label: renderTitle('/psychologist.svg', '心理咨询师', 20),
    description: '有什么想说的吗？不用整理好语言，随便聊聊就好。',
    children: [
      {
        key: '4-1',
        description: `我总是什么都没做却觉得很累`,
      },
      {
        key: '4-2',
        description: `我对家人发火后又后悔，怎么办`,
      },

      {
        key: '4-3',
        description: `每天早上都不想面对新的一天`,
      },
    ],
  },
  {
    key: '5',
    label: renderTitle('/gossip.svg', '风水命理师', 20),
    description: '说说你的近况，我帮你看看家里的气、桌上的局、心里的坎。',
    children: [
      {
        key: '5-1',
        description: `最近老是忘带钥匙，是不是风水问题`,
      },
      {
        key: '5-2',
        description: `家里哪个方位管财运，怎么调`,
      },
      {
        key: '5-3',
        description: `床头朝哪个方向睡得更踏实`,
      },
    ],
  },
  {
    key: '6',
    label: renderTitle('/dream.svg', '周公解梦', 20),
    description: '梦到了什么？说来听听，我替你解一解。',
    children: [
      {
        key: '6-1',
        description: `梦见牙齿掉了还流血，什么意思`,
      },
      {
        key: '6-2',
        description: `反复梦见被人追但跑不动`,
      },
      {
        key: '6-3',
        description: `梦见赶火车永远差一步`,
      },
    ],
  },
];

export default function PromptCards() {
  const { theme } = useThemeStore();
  const { setInput } = useChatStore();
  const { results } = useFetchPrompts();
  const { setSystemPrompt } = useSystemPrompt();

  return (
    <div>
      <Prompts
        items={items}
        classNames={{
          itemContent: 'prompt-desciption',
        }}
        styles={{
          item: {
            backgroundColor: `var(--color-${theme === 'dark' ? 'default' : 'major'})`,
            flex: 'none',
            width: '260px',
            border: '1px solid var(--color-default)',
            padding: '25px 25px 10px 25px',
            color: `var(--color-font)`,
          },
          subItem: {
            border: '1px solid var(--color-placeholder)',
          },
          list: {
            scrollbarWidth: 'thin',
          },
        }}
        onItemClick={(item) => {
          setInput(item.data.description as string);
          const id = item.data.key.split('-')[0];
          setSystemPrompt(results[parseInt(id)]);
        }}
      />
    </div>
  );
}
