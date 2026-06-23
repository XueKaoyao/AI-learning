import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptCards from '../PromptCards';

// Mock @ant-design/x Prompts component
jest.mock('@ant-design/x', () => ({
  Prompts: ({
    items,
    onItemClick,
  }: {
    items?: Array<{
      key: string;
      label: React.ReactNode;
      description: string;
      children?: Array<{ key: string; description: string }>;
    }>;
    onItemClick?: (item: {
      data: { description: string; key: string };
    }) => void;
  }) => (
    <div data-testid="prompts">
      {items?.map((item) => (
        <div key={item.key} data-testid={`prompt-${item.key}`}>
          <div data-testid={`prompt-label-${item.key}`}>{item.label}</div>
          <div data-testid={`prompt-desc-${item.key}`}>{item.description}</div>
          {item.children?.map((child) => (
            <button
              key={child.key}
              data-testid={`prompt-child-${child.key}`}
              onClick={() =>
                onItemClick?.({
                  data: { description: child.description, key: child.key },
                })
              }
            >
              {child.description}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

// Mock antd
jest.mock('antd', () => ({
  Space: ({
    children,
    align,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => <div data-align={align}>{children}</div>,
  Image: ({
    src,
    alt,
    width,
  }: {
    src?: string;
    alt?: string;
    width?: number;
  }) => <img src={src} alt={alt} width={width} />,
}));

// Mock stores
const mockSetInput = jest.fn();
const mockSetSystemPrompt = jest.fn();

jest.mock('../../store/useChatInput', () => ({
  useChatInput: () => ({
    setInput: mockSetInput,
  }),
}));

jest.mock('../../store/useSystemOption', () => ({
  useSystemOption: () => ({
    setSystemPrompt: mockSetSystemPrompt,
  }),
}));

jest.mock('../../store/useThemeStore', () => ({
  useThemeStore: () => ({ theme: 'light' }),
}));

// Mock useFetchPrompts
const mockResults = [
  { id: '1', description: 'Chef Prompt', content: 'You are a chef.' },
  { id: '2', description: 'Engineer Prompt', content: 'You are an engineer.' },
  { id: '3', description: 'Poet Prompt', content: 'You are a poet.' },
  {
    id: '4',
    description: 'Psychologist Prompt',
    content: 'You are a psychologist.',
  },
  {
    id: '5',
    description: 'Feng Shui Prompt',
    content: 'You are a feng shui master.',
  },
  {
    id: '6',
    description: 'Dream Prompt',
    content: 'You are a dream interpreter.',
  },
];

jest.mock('../../hooks/useFetchPrompts', () => ({
  __esModule: true,
  default: () => ({ results: mockResults }),
}));

describe('PromptCards', () => {
  beforeEach(() => {
    mockSetInput.mockClear();
    mockSetSystemPrompt.mockClear();
  });

  describe('rendering', () => {
    it('renders all 6 prompt cards', () => {
      render(<PromptCards />);
      expect(screen.getByTestId('prompts')).toBeInTheDocument();

      // All 6 main prompts should be rendered
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByTestId(`prompt-${i}`)).toBeInTheDocument();
      }
    });

    it('renders prompt descriptions', () => {
      render(<PromptCards />);
      expect(
        screen.getByText('有什么烹饪问题都可以来问我~'),
      ).toBeInTheDocument();
      expect(screen.getByText('技术问题尽管抛过来~')).toBeInTheDocument();
    });

    it('renders SVG icons for each prompt', () => {
      render(<PromptCards />);
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(6);

      const srcs = images.map((img) => img.getAttribute('src'));
      expect(srcs).toContain('/cooker.svg');
      expect(srcs).toContain('/programmer.svg');
      expect(srcs).toContain('/poet.svg');
    });

    it('renders child prompt items (example questions)', () => {
      render(<PromptCards />);
      // Each prompt has 3 children = 18 total child buttons
      expect(screen.getByTestId('prompt-child-1-1')).toBeInTheDocument();
      expect(screen.getByTestId('prompt-child-2-1')).toBeInTheDocument();
    });
  });

  describe('clicking a child prompt', () => {
    it('sets input text to the child description', async () => {
      render(<PromptCards />);

      await userEvent.click(screen.getByTestId('prompt-child-1-1'));

      expect(mockSetInput).toHaveBeenCalledWith(
        '怎么做麻婆豆腐？要详细步骤和用时',
      );
    });

    it('sets the corresponding system prompt', async () => {
      render(<PromptCards />);

      await userEvent.click(screen.getByTestId('prompt-child-2-1'));

      // key '2-1' -> id extracted from key: '2' -> results[2] = index 2
      expect(mockSetSystemPrompt).toHaveBeenCalledWith(mockResults[2]);
    });

    it('handles clicking different children', async () => {
      render(<PromptCards />);

      await userEvent.click(screen.getByTestId('prompt-child-3-1'));
      expect(mockSetInput).toHaveBeenCalledWith(
        '我很清醒但不想动，写一首失眠的诗',
      );

      await userEvent.click(screen.getByTestId('prompt-child-4-2'));
      expect(mockSetInput).toHaveBeenCalledWith('我对家人发火后又后悔，怎么办');
    });
  });

  describe('clicking the last prompt (key 6)', () => {
    it('maps key 6 to results[6]', async () => {
      render(<PromptCards />);

      await userEvent.click(screen.getByTestId('prompt-child-6-1'));

      expect(mockSetSystemPrompt).toHaveBeenCalledWith(mockResults[6]);
      expect(mockSetInput).toHaveBeenCalledWith('梦见牙齿掉了还流血，什么意思');
    });
  });
});
