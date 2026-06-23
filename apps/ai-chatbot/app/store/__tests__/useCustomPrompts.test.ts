import {
  addCustomPrompt,
  loadCustomPrompts,
  clearCustomPrompts,
  updateCustomPrompt,
  deleteCustomPrompt,
} from '../useCustomPrompts';
import { SystemPromptOption } from '../../types/systemPromptType';

function createPrompt(
  id: string,
  description: string,
  content = 'You are helpful.',
  tag?: string,
): SystemPromptOption {
  return { id, description, content, tag };
}

describe('useCustomPrompts', () => {
  describe('addCustomPrompt', () => {
    beforeEach(async () => {
      await clearCustomPrompts();
    });

    it('stores a custom prompt', async () => {
      const prompt = createPrompt('custom-1', 'My Prompt', 'Be creative.');

      await addCustomPrompt(prompt);
      const loaded = await loadCustomPrompts();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('custom-1');
      expect(loaded[0].description).toBe('My Prompt');
      expect(loaded[0].content).toBe('Be creative.');
    });

    it('stores multiple custom prompts', async () => {
      const prompt1 = createPrompt('custom-1', 'Prompt 1');
      const prompt2 = createPrompt('custom-2', 'Prompt 2');

      await addCustomPrompt(prompt1);
      await addCustomPrompt(prompt2);

      const loaded = await loadCustomPrompts();
      expect(loaded).toHaveLength(2);
    });

    it('overwrites a prompt with the same ID', async () => {
      const prompt1 = createPrompt('custom-1', 'Original');
      const prompt2 = createPrompt('custom-1', 'Updated');

      await addCustomPrompt(prompt1);
      await addCustomPrompt(prompt2);

      const loaded = await loadCustomPrompts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].description).toBe('Updated');
    });

    it('stores prompts with tags', async () => {
      const prompt = createPrompt(
        'custom-1',
        'Tagged Prompt',
        'Content',
        'custom',
      );

      await addCustomPrompt(prompt);
      const loaded = await loadCustomPrompts();

      expect(loaded[0].tag).toBe('custom');
    });
  });

  describe('loadCustomPrompts', () => {
    beforeEach(async () => {
      await clearCustomPrompts();
    });

    it('returns empty array when no prompts exist', async () => {
      const prompts = await loadCustomPrompts();
      expect(prompts).toEqual([]);
    });

    it('returns prompts in insertion order', async () => {
      const prompt1 = createPrompt('a', 'First');
      const prompt2 = createPrompt('b', 'Second');
      const prompt3 = createPrompt('c', 'Third');

      await addCustomPrompt(prompt1);
      await addCustomPrompt(prompt2);
      await addCustomPrompt(prompt3);

      const loaded = await loadCustomPrompts();
      expect(loaded.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('clearCustomPrompts', () => {
    it('removes all custom prompts', async () => {
      const prompt = createPrompt('custom-1', 'Test Prompt');
      await addCustomPrompt(prompt);

      await clearCustomPrompts();

      const loaded = await loadCustomPrompts();
      expect(loaded).toEqual([]);
    });

    it('is safe to call on an empty database', async () => {
      await expect(clearCustomPrompts()).resolves.toBeUndefined();
    });
  });

  describe('updateCustomPrompt', () => {
    beforeEach(async () => {
      await clearCustomPrompts();
    });

    it('updates the description of an existing prompt', async () => {
      const prompt = createPrompt('custom-1', 'Original', 'Content');
      await addCustomPrompt(prompt);

      await updateCustomPrompt('custom-1', { description: 'Updated' });

      const loaded = await loadCustomPrompts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].description).toBe('Updated');
      expect(loaded[0].content).toBe('Content'); // unchanged
    });

    it('updates the content of an existing prompt', async () => {
      const prompt = createPrompt('custom-1', 'Desc', 'Original content');
      await addCustomPrompt(prompt);

      await updateCustomPrompt('custom-1', { content: 'Updated content' });

      const loaded = await loadCustomPrompts();
      expect(loaded[0].content).toBe('Updated content');
      expect(loaded[0].description).toBe('Desc'); // unchanged
    });

    it('updates both description and content simultaneously', async () => {
      const prompt = createPrompt('custom-1', 'Old Desc', 'Old Content');
      await addCustomPrompt(prompt);

      await updateCustomPrompt('custom-1', {
        description: 'New Desc',
        content: 'New Content',
      });

      const loaded = await loadCustomPrompts();
      expect(loaded[0].description).toBe('New Desc');
      expect(loaded[0].content).toBe('New Content');
    });

    it('does nothing when prompt ID does not exist', async () => {
      await expect(
        updateCustomPrompt('nonexistent', { description: 'New' }),
      ).resolves.toBeUndefined();

      const loaded = await loadCustomPrompts();
      expect(loaded).toEqual([]);
    });
  });

  describe('deleteCustomPrompt', () => {
    beforeEach(async () => {
      await clearCustomPrompts();
    });

    it('deletes a specific custom prompt', async () => {
      const prompt1 = createPrompt('custom-1', 'Prompt 1');
      const prompt2 = createPrompt('custom-2', 'Prompt 2');

      await addCustomPrompt(prompt1);
      await addCustomPrompt(prompt2);

      await deleteCustomPrompt('custom-1');

      const loaded = await loadCustomPrompts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('custom-2');
    });

    it('deletes the only prompt', async () => {
      const prompt = createPrompt('custom-1', 'Only Prompt');
      await addCustomPrompt(prompt);

      await deleteCustomPrompt('custom-1');

      const loaded = await loadCustomPrompts();
      expect(loaded).toEqual([]);
    });

    it('does nothing when prompt ID does not exist', async () => {
      await expect(deleteCustomPrompt('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('full CRUD lifecycle', () => {
    beforeEach(async () => {
      await clearCustomPrompts();
    });

    it('handles add → load → update → delete sequence', async () => {
      // 1. Add
      const prompt = createPrompt('lifecycle-1', 'Lifecycle Test', 'Initial');
      await addCustomPrompt(prompt);

      let loaded = await loadCustomPrompts();
      expect(loaded).toHaveLength(1);

      // 2. Update
      await updateCustomPrompt('lifecycle-1', {
        description: 'Updated Lifecycle',
        content: 'Updated content',
      });

      loaded = await loadCustomPrompts();
      expect(loaded[0].description).toBe('Updated Lifecycle');
      expect(loaded[0].content).toBe('Updated content');

      // 3. Delete
      await deleteCustomPrompt('lifecycle-1');

      loaded = await loadCustomPrompts();
      expect(loaded).toEqual([]);
    });
  });
});
