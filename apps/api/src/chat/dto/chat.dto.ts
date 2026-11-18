export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatRequestDto = {
  messages: Message[];
  // Absent when the browser could not obtain one: the challenge does not complete
  // on every client, and the server's per-IP rate limit is the real spend control.
  turnstileToken?: string;
};

export type ChatResponseStream = {
  choices?: Array<{
    delta: {
      content?: string;
    };
  }>;
  done?: boolean;
};
