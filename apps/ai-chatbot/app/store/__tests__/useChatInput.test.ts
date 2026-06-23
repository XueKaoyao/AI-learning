import { useChatInput } from '../useChatInput';

describe('useChatInput', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChatInput.setState(useChatInput.getInitialState());
  });

  describe('initial state', () => {
    it('has empty input', () => {
      expect(useChatInput.getState().input).toBe('');
    });

    it('has empty lastSubmittedInput', () => {
      expect(useChatInput.getState().lastSubmittedInput).toBe('');
    });
  });

  describe('setInput', () => {
    it('updates the input value', () => {
      useChatInput.getState().setInput('hello');
      expect(useChatInput.getState().input).toBe('hello');
    });

    it('updates the input to empty string', () => {
      useChatInput.getState().setInput('something');
      useChatInput.getState().setInput('');
      expect(useChatInput.getState().input).toBe('');
    });

    it('updates the input to a long string', () => {
      const longText = 'a'.repeat(1000);
      useChatInput.getState().setInput(longText);
      expect(useChatInput.getState().input).toBe(longText);
    });
  });

  describe('submitInput', () => {
    it('copies input to lastSubmittedInput', () => {
      const store = useChatInput.getState();
      store.setInput('test message');
      store.submitInput();

      expect(useChatInput.getState().lastSubmittedInput).toBe('test message');
    });

    it('clears input after submit', () => {
      const store = useChatInput.getState();
      store.setInput('test message');
      store.submitInput();

      expect(useChatInput.getState().input).toBe('');
    });

    it('handles empty input submit', () => {
      const store = useChatInput.getState();
      store.submitInput();

      expect(useChatInput.getState().lastSubmittedInput).toBe('');
      expect(useChatInput.getState().input).toBe('');
    });

    it('handles multiple consecutive submits', () => {
      const store = useChatInput.getState();
      store.setInput('first');
      store.submitInput();

      store.setInput('second');
      store.submitInput();

      expect(useChatInput.getState().lastSubmittedInput).toBe('second');
      expect(useChatInput.getState().input).toBe('');
    });
  });
});
