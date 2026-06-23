import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sider from '../Sider';
import { SessionType } from '../../types/sessionManage';

// Mock @ant-design/x Conversations (ESM dependency)
jest.mock('@ant-design/x', () => ({
  Conversations: ({
    items,
    menu,
    onActiveChange,
    creation,
  }: {
    items?: Array<{ key: string; label: React.ReactNode }>;
    menu?: (conversation: { key: string }) => {
      items: Array<{
        label: string;
        key: string;
        icon: React.ReactNode;
        danger?: boolean;
        onClick: () => void;
      }>;
    };
    onActiveChange?: (key: string) => void;
    activeKey?: string;
    creation?: { onClick: () => void };
  }) => (
    <div data-testid="conversations">
      <button data-testid="new-chat" onClick={creation?.onClick}>
        New Chat
      </button>
      {items?.map((item) => {
        const menuItems = menu?.({ key: item.key })?.items ?? [];
        return (
          <div
            key={item.key}
            data-testid={`session-${item.key}`}
            onClick={() => onActiveChange?.(item.key)}
          >
            <span data-testid={`session-label-${item.key}`}>{item.label}</span>
            {menuItems.map((m) => (
              <button
                key={m.key}
                data-testid={`menu-${m.key}-${item.key}`}
                onClick={m.onClick}
                data-danger={m.danger}
              >
                {m.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  ),
}));

// Mock antd
jest.mock('antd', () => ({
  Input: ({
    value,
    onChange,
    onPressEnter,
    onBlur,
    onClick,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPressEnter?: () => void;
    onBlur?: () => void;
    onClick?: (e: React.MouseEvent) => void;
    autoFocus?: boolean;
    size?: string;
  }) => (
    <input
      data-testid="rename-input"
      value={value}
      onChange={onChange}
      onKeyDown={(e) => e.key === 'Enter' && onPressEnter?.()}
      onBlur={onBlur}
      onClick={onClick}
    />
  ),
}));

// Mock stores
const mockSetCurrentSessionId = jest.fn();
const mockSetSessionList = jest.fn();
const mockInitialPrompt = jest.fn();
let mockSessions: SessionType[] = [];

jest.mock('../../store/useSessionList', () => ({
  useSessionList: () => ({
    currentSessionId: mockSessions.length > 0 ? mockSessions[0].id : null,
    setCurrentSessionId: mockSetCurrentSessionId,
    sessionList: mockSessions,
    setSessionList: mockSetSessionList,
  }),
}));

jest.mock('../../store/useSystemOption', () => ({
  useSystemOption: () => ({
    initialPrompt: mockInitialPrompt,
  }),
}));

jest.mock('../../store/useMessageHistory', () => ({
  deleteSessionMessages: jest.fn(),
}));

function createSession(id: number, title = 'Test Chat'): SessionType {
  return {
    id,
    title,
    temperature: 0.8,
    systemPrompt: { id: '0', description: '', content: '' },
  };
}

describe('Sider', () => {
  beforeEach(() => {
    mockSessions = [createSession(1, 'Chat 1'), createSession(2, 'Chat 2')];
    mockSetCurrentSessionId.mockClear();
    mockSetSessionList.mockClear();
    mockInitialPrompt.mockClear();
  });

  describe('rendering', () => {
    it('renders the Conversations component', () => {
      render(<Sider />);
      expect(screen.getByTestId('conversations')).toBeInTheDocument();
    });

    it('renders new chat button', () => {
      render(<Sider />);
      expect(screen.getByTestId('new-chat')).toBeInTheDocument();
    });

    it('renders all sessions from the list', () => {
      render(<Sider />);
      expect(screen.getByTestId('session-1')).toBeInTheDocument();
      expect(screen.getByTestId('session-2')).toBeInTheDocument();
    });

    it('renders session titles as labels', () => {
      render(<Sider />);
      expect(screen.getByTestId('session-label-1')).toHaveTextContent('Chat 1');
      expect(screen.getByTestId('session-label-2')).toHaveTextContent('Chat 2');
    });

    it('renders menu items for sessions (Rename + Delete)', () => {
      render(<Sider />);
      expect(screen.getByTestId('menu-Rename-1')).toBeInTheDocument();
      expect(screen.getByTestId('menu-deleteChat-1')).toBeInTheDocument();
    });
  });

  describe('new chat', () => {
    it('resets to null session and initial prompt on new chat click', async () => {
      render(<Sider />);

      await userEvent.click(screen.getByTestId('new-chat'));

      expect(mockSetCurrentSessionId).toHaveBeenCalledWith(null);
      expect(mockInitialPrompt).toHaveBeenCalled();
    });
  });

  describe('session selection', () => {
    it('calls setCurrentSessionId on session click', async () => {
      render(<Sider />);

      await userEvent.click(screen.getByTestId('session-1'));

      expect(mockSetCurrentSessionId).toHaveBeenCalledWith(1);
    });
  });

  describe('rename session', () => {
    it('enters rename mode when Rename is clicked', async () => {
      render(<Sider />);

      await userEvent.click(screen.getByTestId('menu-Rename-1'));

      // Should show the rename input with the session title
      expect(screen.getByTestId('rename-input')).toBeInTheDocument();
    });

    it('saves rename on Enter key', async () => {
      render(<Sider />);

      await userEvent.click(screen.getByTestId('menu-Rename-1'));

      const input = screen.getByTestId('rename-input');
      await userEvent.clear(input);
      await userEvent.type(input, 'Renamed Chat');
      await userEvent.keyboard('{Enter}');

      // Should update session list with renamed title
      expect(mockSetSessionList).toHaveBeenCalled();
    });
  });

  describe('delete session', () => {
    it('handles delete action', async () => {
      render(<Sider />);

      // The delete button should be rendered with danger styling
      const deleteBtn = screen.getByTestId('menu-deleteChat-1');
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn.dataset.danger).toBe('true');
    });
  });

  describe('empty session list', () => {
    it('renders without errors when session list is empty', () => {
      mockSessions = [];
      render(<Sider />);
      expect(screen.getByTestId('conversations')).toBeInTheDocument();
    });
  });
});
