import { useSystemOption } from '../useSystemOption';

describe('useSystemOption', () => {
  beforeEach(() => {
    useSystemOption.setState(useSystemOption.getInitialState());
  });

  describe('initial state', () => {
    it('has default temperature of 0.8', () => {
      expect(useSystemOption.getState().temperature).toBe(0.8);
    });

    it('has default system prompt with id "0"', () => {
      const prompt = useSystemOption.getState().systemPrompt;
      expect(prompt.id).toBe('0');
      expect(prompt.content).toBe('');
      expect(prompt.description).toBe('默认配置：无系统提示词');
    });
  });

  describe('setTemperature', () => {
    it('updates the temperature value', () => {
      useSystemOption.getState().setTemperature(0.5);
      expect(useSystemOption.getState().temperature).toBe(0.5);
    });

    it('sets temperature to minimum (0)', () => {
      useSystemOption.getState().setTemperature(0);
      expect(useSystemOption.getState().temperature).toBe(0);
    });

    it('sets temperature to maximum (1)', () => {
      useSystemOption.getState().setTemperature(1);
      expect(useSystemOption.getState().temperature).toBe(1);
    });
  });

  describe('setSystemPrompt', () => {
    it('updates the system prompt', () => {
      const newPrompt = {
        id: '1',
        description: 'Chef',
        content: 'You are a chef.',
      };
      useSystemOption.getState().setSystemPrompt(newPrompt);
      expect(useSystemOption.getState().systemPrompt).toEqual(newPrompt);
    });

    it('updates to a prompt with a tag', () => {
      const newPrompt = {
        id: 'custom-1',
        description: 'Custom Prompt',
        content: 'Be helpful.',
        tag: 'custom',
      };
      useSystemOption.getState().setSystemPrompt(newPrompt);
      expect(useSystemOption.getState().systemPrompt.tag).toBe('custom');
    });
  });

  describe('initialPrompt', () => {
    it('resets temperature to default 0.8', () => {
      useSystemOption.getState().setTemperature(0.3);
      useSystemOption.getState().initialPrompt();
      expect(useSystemOption.getState().temperature).toBe(0.8);
    });

    it('resets system prompt to default', () => {
      const customPrompt = {
        id: '5',
        description: 'Custom',
        content: 'Custom content',
      };
      useSystemOption.getState().setSystemPrompt(customPrompt);
      useSystemOption.getState().initialPrompt();

      const prompt = useSystemOption.getState().systemPrompt;
      expect(prompt.id).toBe('0');
      expect(prompt.content).toBe('');
    });

    it('resets both temperature and prompt simultaneously', () => {
      useSystemOption.getState().setTemperature(0.1);
      useSystemOption.getState().setSystemPrompt({
        id: '3',
        description: 'Test',
        content: 'Test',
      });
      useSystemOption.getState().initialPrompt();

      expect(useSystemOption.getState().temperature).toBe(0.8);
      expect(useSystemOption.getState().systemPrompt.id).toBe('0');
    });
  });
});
