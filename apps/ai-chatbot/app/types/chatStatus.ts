export const ChatStatus = {
  Idle: 'idle',
  Submitted: 'submitted',
  Streaming: 'streaming',
  Ready: 'ready',
  Error: 'error',
} as const;

export type ChatStatusValue = (typeof ChatStatus)[keyof typeof ChatStatus];
