import { render, screen } from '@testing-library/react';
import WelcomeCard from '../WelcomeCard';

// Mock @ant-design/x — its dependency chain includes ESM (refractor) that Jest
// cannot transform even with transformIgnorePatterns.
jest.mock('@ant-design/x', () => ({
  Welcome: ({
    description,
    style,
  }: {
    description: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="welcome" style={style}>
      {description}
    </div>
  ),
}));

// Mock antd Image — avoid loading the full antd image component
jest.mock('antd', () => ({
  Image: ({
    alt,
    src,
    width,
  }: {
    alt?: string;
    src?: string;
    width?: number;
  }) => <img alt={alt} src={src} width={width} data-testid="ai-image" />,
}));

// Mock PromptCards to avoid complex sub-component rendering
jest.mock('../PromptCards', () => ({
  __esModule: true,
  default: () => <div data-testid="prompt-cards">PromptCards</div>,
}));

// Mock useThemeStore to control theme in tests
const mockSetTheme = jest.fn();
let mockTheme = 'light';

jest.mock('../../store/useThemeStore', () => ({
  useThemeStore: (
    selector?: (state: {
      theme: string;
      setTheme: typeof mockSetTheme;
    }) => unknown,
  ) => {
    const state = { theme: mockTheme, setTheme: mockSetTheme };
    if (selector) return selector(state);
    return state;
  },
}));

describe('WelcomeCard', () => {
  beforeEach(() => {
    mockTheme = 'light';
    mockSetTheme.mockClear();
  });

  describe('rendering', () => {
    it('renders the welcome greeting', () => {
      render(<WelcomeCard />);
      expect(
        screen.getByText('你好，欢迎使用AI Chatbot！'),
      ).toBeInTheDocument();
    });

    it('renders the subtitle text', () => {
      render(<WelcomeCard />);
      expect(screen.getByText('有什么问题都可以来问我哦~')).toBeInTheDocument();
    });

    it('renders the PromptCards component', () => {
      render(<WelcomeCard />);
      expect(screen.getByTestId('prompt-cards')).toBeInTheDocument();
    });

    it('renders the AI assistant image', () => {
      render(<WelcomeCard />);
      const image = screen.getByTestId('ai-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute(
        'src',
        'https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp',
      );
    });

    it('renders the Welcome container', () => {
      render(<WelcomeCard />);
      expect(screen.getByTestId('welcome')).toBeInTheDocument();
    });
  });

  describe('theme', () => {
    it('renders with light theme (no error)', () => {
      mockTheme = 'light';
      render(<WelcomeCard />);
      expect(
        screen.getByText('你好，欢迎使用AI Chatbot！'),
      ).toBeInTheDocument();
    });

    it('renders with dark theme (no error)', () => {
      mockTheme = 'dark';
      render(<WelcomeCard />);
      expect(
        screen.getByText('你好，欢迎使用AI Chatbot！'),
      ).toBeInTheDocument();
    });
  });
});
