import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorCard from '../ErrorCard';

describe('ErrorCard', () => {
  describe('rendering', () => {
    it('renders the error message', () => {
      render(<ErrorCard message="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders the Chinese title "出错了"', () => {
      render(<ErrorCard message="Error" />);
      expect(screen.getByText('出错了')).toBeInTheDocument();
    });

    it('renders the error icon', () => {
      render(<ErrorCard message="Error" />);
      // CloseCircleFilled renders an <svg> inside a <span> with role="img"
      const icon = document.querySelector('span[role="img"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('renders retry button when onRetry is provided', () => {
      render(<ErrorCard message="Error" onRetry={jest.fn()} />);
      expect(screen.getByText('重试')).toBeInTheDocument();
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorCard message="Error" />);
      expect(screen.queryByText('重试')).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn();
      render(<ErrorCard message="Error" onRetry={onRetry} />);

      await userEvent.click(screen.getByText('重试'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('retry button has the reload icon', () => {
      render(<ErrorCard message="Error" onRetry={jest.fn()} />);

      const retryButton = screen.getByText('重试').closest('button');
      expect(retryButton?.querySelector('.anticon-reload')).toBeInTheDocument();
    });
  });

  describe('dismiss button', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      render(<ErrorCard message="Error" onDismiss={jest.fn()} />);
      expect(screen.getByLabelText('关闭')).toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(<ErrorCard message="Error" />);
      expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      render(<ErrorCard message="Error" onDismiss={onDismiss} />);

      await userEvent.click(screen.getByLabelText('关闭'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('combined callbacks', () => {
    it('renders and responds to both callbacks', async () => {
      const onRetry = jest.fn();
      const onDismiss = jest.fn();

      render(
        <ErrorCard message="Error" onRetry={onRetry} onDismiss={onDismiss} />,
      );

      await userEvent.click(screen.getByText('重试'));
      await userEvent.click(screen.getByLabelText('关闭'));

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('message content', () => {
    it('displays long error messages', () => {
      const longMessage =
        'This is a very long error message that contains detailed information about what went wrong in the application.';
      render(<ErrorCard message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles empty message', () => {
      render(<ErrorCard message="" />);
      // The message paragraph should exist but be empty
      const paragraphs = screen.getAllByRole('paragraph');
      // The first paragraph is "出错了", the second is the message
      expect(paragraphs[0]).toHaveTextContent('出错了');
    });
  });
});
