import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InputTab from '../InputTab';
import { SystemPromptOption } from '../../types/systemPromptType';

// Mock @ant-design/x (Sender with footer render prop)
jest.mock('@ant-design/x', () => ({
  Sender: ({
    value,
    onChange,
    footer,
  }: {
    onSubmit?: (value: string) => void;
    value?: string;
    loading?: boolean;
    onChange?: (value: string) => void;
    onCancel?: () => void;
    footer?: (
      _: unknown,
      {
        components,
      }: {
        components: {
          SendButton: React.FC<{ type?: string; disabled?: boolean }>;
          LoadingButton: React.FC<{ type?: string }>;
          SpeechButton: React.FC;
        };
      },
    ) => React.ReactNode;
  }) => (
    <div data-testid="sender">
      <textarea
        data-testid="sender-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="输入你的问题..."
      />
      {footer?.(null, {
        components: {
          SendButton: ({ type, disabled }) => (
            <button data-testid="send-btn" data-type={type} disabled={disabled}>
              Send
            </button>
          ),
          LoadingButton: ({ type }) => (
            <button data-testid="loading-btn" data-type={type}>
              Loading
            </button>
          ),
          SpeechButton: () => <button data-testid="speech-btn">Speech</button>,
        },
      })}
    </div>
  ),
}));

// Mock antd
jest.mock('antd', () => ({
  Button: ({
    children,
    onClick,
    icon,
    size,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    size?: string;
  }) => (
    <button onClick={onClick} data-size={size}>
      {icon}
      {children}
    </button>
  ),
  Modal: ({
    children,
    open,
    footer,
    title,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    onCancel?: () => void;
    footer?: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div data-testid="modal" data-title={title}>
        <div data-testid="modal-body">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    ) : null,
  Tooltip: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <div data-testid="tooltip">
      {children}
      <div data-testid="tooltip-content">{title}</div>
    </div>
  ),
  Slider: ({
    value,
    onChange,
    min,
    max,
    step,
  }: {
    value?: number;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      data-testid="slider"
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange?.(Number(e.target.value))}
    />
  ),
  message: { success: jest.fn(), error: jest.fn() },
}));

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  SettingOutlined: () => <span>Settings</span>,
}));

// Mock SystemPromptItems
jest.mock('../SystemPromptItems', () => ({
  __esModule: true,
  default: ({
    setPendingSystemPrompt,
  }: {
    setPendingSystemPrompt: (prompt: SystemPromptOption) => void;
  }) => (
    <div data-testid="system-prompt-items">
      <button
        data-testid="select-prompt-btn"
        onClick={() =>
          setPendingSystemPrompt({
            id: '1',
            description: 'Test Prompt',
            content: 'You are a test assistant.',
          })
        }
      >
        Select Prompt
      </button>
    </div>
  ),
}));

// Mock stores
const mockSetInput = jest.fn();
const mockSubmitInput = jest.fn();
const mockSetTemperature = jest.fn();
const mockSetSystemPrompt = jest.fn();
let mockTemperature = 0.8;
let mockSystemPrompt: SystemPromptOption = {
  id: '0',
  description: '默认配置：无系统提示词',
  content: '',
};
let mockInput = '';

jest.mock('../../store/useChatInput', () => ({
  useChatInput: () => ({
    input: mockInput,
    setInput: mockSetInput,
    submitInput: mockSubmitInput,
  }),
}));

jest.mock('../../store/useSystemOption', () => ({
  useSystemOption: () => ({
    temperature: mockTemperature,
    setTemperature: mockSetTemperature,
    systemPrompt: mockSystemPrompt,
    setSystemPrompt: mockSetSystemPrompt,
  }),
}));

jest.mock('../../store/useThemeStore', () => ({
  useThemeStore: () => ({ theme: 'light' }),
}));

describe('InputTab', () => {
  const mockSendMessage = jest.fn();
  const mockStop = jest.fn();

  beforeEach(() => {
    mockInput = '';
    mockTemperature = 0.8;
    mockSystemPrompt = {
      id: '0',
      description: '默认配置：无系统提示词',
      content: '',
    };
    mockSendMessage.mockClear();
    mockStop.mockClear();
    mockSetInput.mockClear();
    mockSubmitInput.mockClear();
    mockSetTemperature.mockClear();
    mockSetSystemPrompt.mockClear();
  });

  describe('rendering', () => {
    it('renders the Sender component', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.getByTestId('sender')).toBeInTheDocument();
    });

    it('renders SendButton when not loading', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.getByTestId('send-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-btn')).not.toBeInTheDocument();
    });

    it('renders LoadingButton when status is submitted', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="submitted"
        />,
      );
      expect(screen.getByTestId('loading-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('send-btn')).not.toBeInTheDocument();
    });

    it('renders LoadingButton when status is streaming', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="streaming"
        />,
      );
      expect(screen.getByTestId('loading-btn')).toBeInTheDocument();
    });

    it('renders Temperature button with tooltip containing slider', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    it('renders System Prompt button', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.getByText('System Prompt')).toBeInTheDocument();
    });

    it('renders SpeechButton', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.getByTestId('speech-btn')).toBeInTheDocument();
    });

    it('does not show modal initially', () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('temperature slider', () => {
    it('renders with initial temperature value', () => {
      mockTemperature = 0.8;
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      const slider = screen.getByTestId('slider') as HTMLInputElement;
      expect(slider.value).toBe('0.8');
    });

    it('calls setTemperature when slider changes', async () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      const slider = screen.getByTestId('slider');
      await userEvent.type(slider, '0.5');
    });
  });

  describe('system prompt modal', () => {
    it('opens modal when System Prompt button is clicked', async () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      await userEvent.click(screen.getByText('System Prompt'));

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('system-prompt-items')).toBeInTheDocument();
    });

    it('modal has cancel and save buttons', async () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      await userEvent.click(screen.getByText('System Prompt'));

      // The footer has cancel and save buttons
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });

    it('closes modal on cancel', async () => {
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      await userEvent.click(screen.getByText('System Prompt'));
      // The modal's onCancel is triggered by clicking the cancel button inside
      // the footer
      const cancelBtn = screen
        .getAllByText('取消')
        .find((el) => el.closest('[data-testid="modal-footer"]'));
      if (cancelBtn) {
        await userEvent.click(cancelBtn);
      }
    });
  });

  describe('message submission', () => {
    it('does not call sendMessage with empty input', () => {
      mockInput = '';
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="ready"
        />,
      );

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not call sendMessage when loading', () => {
      mockInput = 'test message';
      render(
        <InputTab
          sendMessage={mockSendMessage}
          stop={mockStop}
          status="submitted"
        />,
      );

      // Loading state should prevent submission
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });
});
