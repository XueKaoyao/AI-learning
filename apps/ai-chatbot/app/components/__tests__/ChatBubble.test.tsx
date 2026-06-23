import { render, screen } from '@testing-library/react';
import ChatBubble from '../ChatBubble';
import { ChatStatus } from '../../types/chatStatus';

// Mock @ant-design/x (Bubble.List, Actions)
// The Bubble.List mock renders content, extra (Actions), and calls
// contentRender for markdown rendering (assistant messages).
jest.mock('@ant-design/x', () => ({
  Bubble: {
    List: ({
      items,
    }: {
      items?: Array<{
        key: string;
        role: string;
        content: string | React.ReactNode;
        placement?: string;
        extra?: React.ReactNode;
        contentRender?: (content: string) => React.ReactNode;
      }>;
    }) => (
      <div data-testid="bubble-list">
        {items?.map((item) => {
          const renderedContent =
            item.contentRender && typeof item.content === 'string'
              ? item.contentRender(item.content)
              : typeof item.content === 'string'
                ? item.content
                : null;
          return (
            <div
              key={item.key}
              data-testid={`bubble-${item.key}`}
              data-role={item.role}
              data-placement={item.placement}
            >
              <div data-testid={`bubble-content-${item.key}`}>
                {renderedContent}
              </div>
              {item.extra && (
                <div data-testid={`bubble-extra-${item.key}`}>{item.extra}</div>
              )}
            </div>
          );
        })}
      </div>
    ),
  },
  // Actions component renders a list of action items (Copy, Regenerate, etc.)
  Actions: Object.assign(
    ({
      items,
    }: {
      items?: Array<{
        key: string;
        label: string;
        actionRender?: () => React.ReactNode;
      }>;
    }) => (
      <div data-testid="actions">
        {items?.map((item) => (
          <span key={item.key} data-testid={`action-${item.key}`}>
            {item.actionRender?.()}
          </span>
        ))}
      </div>
    ),
    {
      Copy: () => <button data-testid="copy-action">Copy</button>,
    },
  ),
}));

// Mock @ant-design/x-markdown
jest.mock('@ant-design/x-markdown', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <div data-testid="x-markdown">{content}</div>
  ),
}));

// Mock CSS imports
jest.mock('@ant-design/x-markdown/themes/light.css', () => ({}));
jest.mock('@ant-design/x-markdown/themes/dark.css', () => ({}));

// Mock antd Avatar
jest.mock('antd', () => ({
  Avatar: ({ icon }: { icon?: React.ReactNode }) => (
    <div data-testid="avatar">{icon}</div>
  ),
}));

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  OpenAIOutlined: () => <span>AI</span>,
  UserOutlined: () => <span>User</span>,
  ReloadOutlined: ({
    onClick,
    style,
  }: {
    onClick?: () => void;
    style?: Record<string, string>;
  }) => (
    <button data-testid="regenerate-btn" onClick={onClick} style={style}>
      Regenerate
    </button>
  ),
}));

// Mock useThemeStore
jest.mock('../../store/useThemeStore', () => ({
  useThemeStore: () => ({ theme: 'light' }),
}));

// Helper to create mock UIMessage objects
function createMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): import('ai').UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
    createdAt: new Date(),
  } as import('ai').UIMessage;
}

describe('ChatBubble', () => {
  const mockRegenerate = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockRegenerate.mockClear();
  });

  describe('rendering', () => {
    it('renders a Bubble.List', () => {
      render(
        <ChatBubble
          messages={[]}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );
      expect(screen.getByTestId('bubble-list')).toBeInTheDocument();
    });

    it('renders user messages', () => {
      const messages = [createMessage('1', 'user', 'Hello')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.getByTestId('bubble-1')).toBeInTheDocument();
      expect(screen.getByTestId('bubble-1').dataset.role).toBe('user');
      expect(screen.getByTestId('bubble-1').dataset.placement).toBe('end');
    });

    it('renders assistant messages', () => {
      const messages = [createMessage('2', 'assistant', 'Hi there!')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.getByTestId('bubble-2')).toBeInTheDocument();
      expect(screen.getByTestId('bubble-2').dataset.role).toBe('assistant');
      expect(screen.getByTestId('bubble-2').dataset.placement).toBe('start');
    });

    it('renders copy action for each message', () => {
      const messages = [
        createMessage('1', 'user', 'Hello'),
        createMessage('2', 'assistant', 'Hi'),
      ];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      const copyButtons = screen.getAllByTestId('copy-action');
      expect(copyButtons).toHaveLength(2);
    });
  });

  describe('streaming indicator', () => {
    it('shows thinking dots when status is Submitted and last message is from user', () => {
      const messages = [createMessage('1', 'user', 'What is AI?')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Submitted}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.getByTestId('bubble-thinking')).toBeInTheDocument();
    });

    it('does not show thinking dots when status is Ready', () => {
      const messages = [createMessage('1', 'user', 'What is AI?')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.queryByTestId('bubble-thinking')).not.toBeInTheDocument();
    });

    it('does not show thinking dots when last message is already from assistant', () => {
      const messages = [
        createMessage('1', 'user', 'Hello'),
        createMessage('2', 'assistant', 'Hi!'),
      ];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Submitted}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.queryByTestId('bubble-thinking')).not.toBeInTheDocument();
    });

    it('does not show thinking dots on empty messages', () => {
      render(
        <ChatBubble
          messages={[]}
          status={ChatStatus.Submitted}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.queryByTestId('bubble-thinking')).not.toBeInTheDocument();
    });
  });

  describe('regenerate', () => {
    it('shows regenerate button only for the last assistant message when idle', () => {
      const messages = [
        createMessage('1', 'user', 'Hello'),
        createMessage('2', 'assistant', 'Hi there!'),
        createMessage('3', 'user', 'How are you?'),
        createMessage('4', 'assistant', 'I am fine!'),
      ];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      // Regenerate button should exist for the last assistant message
      const regenerateBtns = screen.getAllByTestId('regenerate-btn');
      expect(regenerateBtns).toHaveLength(1);
    });

    it('does not show regenerate when status is streaming', () => {
      const messages = [
        createMessage('1', 'user', 'Hello'),
        createMessage('2', 'assistant', 'Hi!'),
      ];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Streaming}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.queryByTestId('regenerate-btn')).not.toBeInTheDocument();
    });

    it('does not show regenerate when status is submitted', () => {
      const messages = [
        createMessage('1', 'user', 'Hello'),
        createMessage('2', 'assistant', 'Hi!'),
      ];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Submitted}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.queryByTestId('regenerate-btn')).not.toBeInTheDocument();
    });
  });

  describe('markdown rendering', () => {
    it('uses XMarkdown for assistant messages', () => {
      const messages = [createMessage('1', 'assistant', '# Markdown Title')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      // XMarkdown is rendered inside the content area via contentRender
      expect(screen.getByTestId('x-markdown')).toBeInTheDocument();
      expect(screen.getByTestId('x-markdown')).toHaveTextContent(
        '# Markdown Title',
      );
    });

    it('does not use XMarkdown for user messages', () => {
      const messages = [createMessage('1', 'user', 'plain text')];
      render(
        <ChatBubble
          messages={messages}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      // User messages shouldn't have XMarkdown in their content area
      expect(screen.queryByTestId('x-markdown')).not.toBeInTheDocument();
    });
  });

  describe('message parts concatenation', () => {
    it('concatenates text parts from multiple-parts messages', () => {
      const message = createMessage('1', 'user', 'Hello World');
      render(
        <ChatBubble
          messages={[message]}
          status={ChatStatus.Ready}
          regenerate={mockRegenerate}
        />,
      );

      expect(screen.getByTestId('bubble-content-1')).toHaveTextContent(
        'Hello World',
      );
    });
  });
});
