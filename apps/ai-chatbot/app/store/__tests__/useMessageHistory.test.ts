import {
  setMessageHistory,
  loadMessageHistory,
  clearMessageHistory,
  deleteSessionMessages,
} from '../useMessageHistory';
import { UIMessage } from 'ai';

// Helper to create mock UIMessage objects
function createMockMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
    createdAt: new Date(),
  } as UIMessage;
}

describe('useMessageHistory', () => {
  const sessionId1 = 1001;
  const sessionId2 = 1002;

  describe('setMessageHistory', () => {
    beforeEach(async () => {
      await clearMessageHistory();
    });

    it('stores a single message for a session', async () => {
      const msg = createMockMessage('msg-1', 'user', 'Hello');

      await setMessageHistory([msg], sessionId1);
      const loaded = await loadMessageHistory(sessionId1);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('msg-1');
      expect(loaded[0].role).toBe('user');
    });

    it('stores multiple messages for a session', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'Hello');
      const msg2 = createMockMessage('msg-2', 'assistant', 'Hi there!');

      await setMessageHistory([msg1, msg2], sessionId1);
      const loaded = await loadMessageHistory(sessionId1);

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('msg-1');
      expect(loaded[1].id).toBe('msg-2');
    });

    it('appends messages incrementally without losing existing ones', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'First');
      const msg2 = createMockMessage('msg-2', 'assistant', 'Second');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId1);

      const loaded = await loadMessageHistory(sessionId1);
      expect(loaded).toHaveLength(2);
    });

    it('does not duplicate messages with the same ID', async () => {
      const msg = createMockMessage('msg-1', 'user', 'Hello');

      await setMessageHistory([msg], sessionId1);
      await setMessageHistory([msg], sessionId1); // same ID

      const loaded = await loadMessageHistory(sessionId1);
      expect(loaded).toHaveLength(1);
    });

    it('handles empty message array gracefully', async () => {
      await expect(setMessageHistory([], sessionId1)).resolves.toBeUndefined();
    });

    it('isolates messages between different sessions', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'Session 1');
      const msg2 = createMockMessage('msg-2', 'user', 'Session 2');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId2);

      const loaded1 = await loadMessageHistory(sessionId1);
      const loaded2 = await loadMessageHistory(sessionId2);

      expect(loaded1).toHaveLength(1);
      expect(loaded1[0].id).toBe('msg-1');
      expect(loaded2).toHaveLength(1);
      expect(loaded2[0].id).toBe('msg-2');
    });
  });

  describe('loadMessageHistory', () => {
    beforeEach(async () => {
      await clearMessageHistory();
    });

    it('returns empty array for null sessionId', async () => {
      const loaded = await loadMessageHistory(null);
      expect(loaded).toEqual([]);
    });

    it('returns empty array for a session with no messages', async () => {
      const loaded = await loadMessageHistory(99999);
      expect(loaded).toEqual([]);
    });

    it('returns messages in insertion order', async () => {
      const msg1 = createMockMessage('a', 'user', 'A');
      const msg2 = createMockMessage('b', 'assistant', 'B');
      const msg3 = createMockMessage('c', 'user', 'C');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId1);
      await setMessageHistory([msg3], sessionId1);

      const loaded = await loadMessageHistory(sessionId1);
      expect(loaded).toHaveLength(3);
      expect(loaded.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('only returns messages for the requested session', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'S1');
      const msg2 = createMockMessage('msg-2', 'user', 'S2');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId2);

      const loaded = await loadMessageHistory(sessionId1);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('msg-1');
    });
  });

  describe('clearMessageHistory', () => {
    it('removes all messages', async () => {
      const msg = createMockMessage('msg-1', 'user', 'Hello');
      await setMessageHistory([msg], sessionId1);

      await clearMessageHistory();

      const loaded = await loadMessageHistory(sessionId1);
      expect(loaded).toEqual([]);
    });

    it('is safe to call on an empty database', async () => {
      await expect(clearMessageHistory()).resolves.toBeUndefined();
    });
  });

  describe('deleteSessionMessages', () => {
    beforeEach(async () => {
      await clearMessageHistory();
    });

    it('deletes all messages for a specific session', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'S1');
      const msg2 = createMockMessage('msg-2', 'user', 'S2');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId2);

      await deleteSessionMessages(sessionId1);

      const loaded1 = await loadMessageHistory(sessionId1);
      const loaded2 = await loadMessageHistory(sessionId2);

      expect(loaded1).toEqual([]);
      expect(loaded2).toHaveLength(1);
    });

    it('does nothing when the session has no messages', async () => {
      await expect(deleteSessionMessages(sessionId1)).resolves.toBeUndefined();
    });

    it('does nothing when database is empty', async () => {
      await expect(deleteSessionMessages(sessionId1)).resolves.toBeUndefined();
    });

    it('keeps other session messages intact', async () => {
      const msg1 = createMockMessage('msg-1', 'user', 'Keep');
      const msg2 = createMockMessage('msg-2', 'user', 'Delete');
      const msg3 = createMockMessage('msg-3', 'assistant', 'Keep');

      await setMessageHistory([msg1], sessionId1);
      await setMessageHistory([msg2], sessionId2);
      await setMessageHistory([msg3], sessionId1);

      await deleteSessionMessages(sessionId2);

      const remaining = await loadMessageHistory(sessionId1);
      expect(remaining).toHaveLength(2);
    });
  });
});
