import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemPromptItems from '../SystemPromptItems';
import { SystemPromptOption } from '../../types/systemPromptType';

// Mock lodash throttle — execute immediately in tests
jest.mock('lodash/throttle', () => ({
  __esModule: true,
  default: (fn: (...args: unknown[]) => void) => {
    const throttled = (...args: unknown[]) => fn(...args);
    throttled.cancel = jest.fn();
    return throttled;
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'mock-nanoid-12345678',
}));

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span data-testid="delete-icon">Delete</span>,
  EditOutlined: () => <span data-testid="edit-icon">Edit</span>,
}));

// Mock antd
jest.mock('antd', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
  }) => (
    <button onClick={onClick} data-type={type}>
      {children}
    </button>
  ),
  Card: ({
    children,
    onClick,
    hoverable,
    styles,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    hoverable?: boolean;
    styles?: Record<string, Record<string, unknown>>;
  }) => (
    <div
      onClick={onClick}
      data-hoverable={hoverable}
      data-testid={`card-${(styles?.root as Record<string, unknown>)?.backgroundColor || 'default'}`}
    >
      {children}
    </div>
  ),
  Input: Object.assign(
    ({
      placeholder,
      value,
      onChange,
      rows,
    }: {
      placeholder?: string;
      value?: string;
      onChange?: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => void;
      rows?: number;
    }) => {
      const isTextArea = rows !== undefined;
      return isTextArea ? (
        <textarea
          data-testid="textarea-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          rows={rows}
        />
      ) : (
        <input
          data-testid="text-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        />
      );
    },
  ),
  message: { success: jest.fn(), error: jest.fn() },
  Popconfirm: ({
    children,
    onConfirm,
    title,
  }: {
    children: React.ReactNode;
    onConfirm?: () => void;
    title?: string;
    description?: string;
  }) => (
    <div data-testid="popconfirm" data-title={title}>
      <button data-testid="popconfirm-trigger" onClick={onConfirm}>
        {children}
      </button>
    </div>
  ),
  Radio: Object.assign(
    ({
      children,
      value,
      className,
    }: {
      children?: React.ReactNode;
      value?: string;
      className?: string;
    }) => (
      <div data-testid={`radio-${value}`} className={className}>
        {children}
      </div>
    ),
    {
      Group: ({
        children,
        value,
      }: {
        children: React.ReactNode;
        value?: string;
        onChange?: (e: { target: { value: string } }) => void;
      }) => (
        <div data-testid="radio-group" data-value={value}>
          {children}
        </div>
      ),
    },
  ),
}));

// Mock stores and hooks
const mockSetPendingSystemPrompt = jest.fn();
const mockSetResults = jest.fn();
const mockAddCustomPrompt = jest.fn().mockResolvedValue(undefined);
const mockDeleteCustomPrompt = jest.fn().mockResolvedValue(undefined);
const mockUpdateCustomPrompt = jest.fn().mockResolvedValue(undefined);

let mockSystemPrompt: SystemPromptOption = {
  id: '0',
  description: '默认配置：无系统提示词',
  content: '',
};

let mockResults: SystemPromptOption[] = [
  { id: '1', description: 'Chef', content: 'You are a chef.' },
  { id: '2', description: 'Engineer', content: 'You are an engineer.' },
];

jest.mock('../../store/useSystemOption', () => ({
  useSystemOption: () => ({
    systemPrompt: mockSystemPrompt,
  }),
}));

jest.mock('../../hooks/useFetchPrompts', () => ({
  __esModule: true,
  default: () => ({
    results: mockResults,
    setResults: mockSetResults,
  }),
}));

jest.mock('../../store/useCustomPrompts', () => ({
  addCustomPrompt: (...args: unknown[]) => mockAddCustomPrompt(...args),
  deleteCustomPrompt: (...args: unknown[]) => mockDeleteCustomPrompt(...args),
  updateCustomPrompt: (...args: unknown[]) => mockUpdateCustomPrompt(...args),
}));

describe('SystemPromptItems', () => {
  beforeEach(() => {
    mockSystemPrompt = {
      id: '0',
      description: '默认配置：无系统提示词',
      content: '',
    };
    mockResults = [
      { id: '1', description: 'Chef', content: 'You are a chef.' },
      { id: '2', description: 'Engineer', content: 'You are an engineer.' },
    ];
    mockSetPendingSystemPrompt.mockClear();
    mockSetResults.mockClear();
    mockAddCustomPrompt.mockClear();
    mockDeleteCustomPrompt.mockClear();
    mockUpdateCustomPrompt.mockClear();
  });

  describe('rendering', () => {
    it('renders the Radio.Group with correct initial value', () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );
      const group = screen.getByTestId('radio-group');
      expect(group).toBeInTheDocument();
      expect(group.dataset.value).toBe('0');
    });

    it('renders built-in prompt options as radio items', () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );
      expect(screen.getByTestId('radio-1')).toBeInTheDocument();
      expect(screen.getByTestId('radio-2')).toBeInTheDocument();
    });

    it('renders the "新增提示词" card when not adding', () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );
      expect(screen.getByText('新增提示词')).toBeInTheDocument();
    });

    it('shows the add form when "新增提示词" card is clicked', async () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      await userEvent.click(screen.getByText('新增提示词'));

      // The form should now show a "取消" button and "保存" button
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });
  });

  describe('selecting a prompt', () => {
    it('calls throttled setPendingSystemPrompt on selection', async () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      // Click on the first prompt card
      const firstCard = screen.getByTestId('radio-1');
      await userEvent.click(firstCard);

      // Should have called setPendingSystemPrompt with the Chef prompt
      expect(mockSetPendingSystemPrompt).toHaveBeenCalledWith(mockResults[0]);
    });
  });

  describe('adding a custom prompt', () => {
    it('shows input fields and save/cancel buttons in add mode', async () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      await userEvent.click(screen.getByText('新增提示词'));

      expect(screen.getByText('自定义提示词')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    it('cancels add mode when cancel is clicked', async () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      await userEvent.click(screen.getByText('新增提示词'));
      await userEvent.click(screen.getByText('取消'));

      // Should return to the "新增提示词" card view
      expect(screen.getByText('新增提示词')).toBeInTheDocument();
    });
  });

  describe('custom prompt actions (edit/delete)', () => {
    beforeEach(() => {
      mockResults = [
        { id: '1', description: 'Chef', content: 'You are a chef.' },
        {
          id: 'custom-1',
          description: 'My Custom Prompt',
          content: 'Be creative.',
          tag: 'custom',
        },
      ];
    });

    it('renders edit and delete icons for custom prompts', () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('delete-icon')).toBeInTheDocument();
    });

    it('does not render edit/delete icons for built-in prompts', () => {
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      // Built-in prompt 'Chef' at id='1' should not have edit/delete
      const radio1 = screen.getByTestId('radio-1');
      expect(radio1.querySelector('[data-testid="edit-icon"]')).toBeNull();
    });
  });

  describe('empty results', () => {
    it('renders correctly with empty results', () => {
      mockResults = [];
      render(
        <SystemPromptItems
          setPendingSystemPrompt={mockSetPendingSystemPrompt}
        />,
      );

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
      expect(screen.getByText('新增提示词')).toBeInTheDocument();
    });
  });
});
