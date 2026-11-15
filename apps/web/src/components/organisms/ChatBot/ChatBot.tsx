'use client';
import { Button, Container, ScrollArea, TextInput, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import Turnstile from 'react-cloudflare-turnstile';
import useSWRMutation from 'swr/mutation';

import { HtmlContent } from '@/components/atoms';

import classes from './ChatBot.module.scss';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// A Turnstile site key is authorised for specific hostnames; on any other host the
// widget answers 110200 and retries forever. NEXT_PUBLIC_CAPTCHA_HOSTS is an explicit
// allowlist (build-time, like every NEXT_PUBLIC_* value in this repo). Left unset the
// widget keeps mounting in production, except on loopback, where a deployed key is
// never authorised and the panel would stay permanently disabled.
function shouldMountCaptcha(hostname: string) {
  const allowedHosts = (process.env.NEXT_PUBLIC_CAPTCHA_HOSTS || '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);

  const host = hostname.toLowerCase();
  if (allowedHosts.length > 0) {
    return allowedHosts.includes(host);
  }

  const isLoopback = /^(?:localhost|127\.0\.0\.1|\[::1\]|::1|0\.0\.0\.0)$/.test(host) || host.endsWith('.localhost');
  return !isLoopback;
}

async function sendChatMessage(url: string, { arg }: { arg: { messages: Message[]; turnstileToken: string | null } }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: arg.messages,
      turnstileToken: arg.turnstileToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'fetch_error');
  }

  return response;
}

export function ChatBot() {
  const t = useTranslations('ChatBot');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  // Resolved after mount: the hostname is browser-only, and rendering the widget
  // on the first pass would mismatch hydration.
  const [captchaMode, setCaptchaMode] = useState<'pending' | 'mount' | 'skip'>('pending');
  const viewportRef = useRef<HTMLDivElement>(null);

  const { trigger, isMutating } = useSWRMutation('/portfolio/api/chat', sendChatMessage);
  const suggestedQueries = t.raw('suggestedQueries') as string[];
  const formRef = useRef<HTMLFormElement>(null);

  const hasConversation = messages.length > 0 || streamingMessage;
  // Empty state sizes to its own content; only a live conversation gets a
  // fixed transcript window, so the console never opens with dead space.
  const scrollAreaHeight = hasConversation ? 500 : undefined;

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTurnstileToken('dev-mode-bypass');
      setCaptchaMode('skip');
      return;
    }

    if (shouldMountCaptcha(window.location.hostname)) {
      setCaptchaMode('mount');
      return;
    }

    // A production build on a host the site key cannot serve: leave the panel
    // closed instead of sending a token the server will reject. Can't be reached
    // in development, which returned above.
    setCaptchaMode('skip');
  }, []);

  const handleSendMessage = async (content: string) => {
    // The prompt rows bypass the send button, so the gate has to be checked here
    // too: without a token the server answers 400 and the panel says it failed.
    if (!content.trim() || isMutating || (captchaMode === 'mount' && !turnstileToken)) {
      return;
    }

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setStreamingMessage('');

    try {
      const response = await trigger({
        messages: newMessages,
        turnstileToken,
      } as any);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  setStreamingMessage(assistantMessage);
                }
              } catch {
                // Skip invalid JSON
              }
            } else {
              // Try to parse as raw JSON (in case SSE prefix is missing)
              try {
                const parsed = JSON.parse(trimmedLine);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  setStreamingMessage(assistantMessage);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setStreamingMessage(assistantMessage);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      if (assistantMessage) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        setStreamingMessage('');
      } else {
        throw new Error('empty_response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setStreamingMessage('');
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      // We use the error message if it's a known one, otherwise fallback to translation
      const content = errorMessage === 'fetch_error' || errorMessage === 'empty_response'
        ? t('error')
        : (errorMessage === 'unknown_error' ? t('error') : errorMessage);

      setMessages(prev => [...prev, { role: 'assistant', content }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <Container size="lg" py="xl">
      <div className={classes.shell} data-busy={isMutating ? 'true' : undefined}>
        <header className={classes.head}>
          <div className={classes.headTitle}>
            <div className={classes.eyebrow}>{t('subtitle')}</div>
            <Title order={2} className={classes.title}>
              {t('title')}
            </Title>
          </div>
          <div className={classes.headMeta}>
            <span className={classes.pulse} aria-hidden="true" />
            <span>{t('poweredBy')}</span>
          </div>
        </header>

        <div className={classes.console}>
          <ScrollArea h={scrollAreaHeight} viewportRef={viewportRef} type="auto" className={classes.scrollArea}>
            <div className={classes.transcript}>
              <div className={classes.turn} data-role="assistant">
                <div className={classes.turnIndex}>00</div>
                <div className={classes.turnBody}>
                  <HtmlContent content={t('welcomeMessage')} />
                </div>
              </div>

              {messages.map((msg, index) => (
                <div key={index} className={classes.turn} data-role={msg.role}>
                  <div className={classes.turnIndex}>{String(index + 1).padStart(2, '0')}</div>
                  <div className={classes.turnBody}>
                    <HtmlContent content={msg.content} />
                  </div>
                </div>
              ))}

              {streamingMessage && (
                <div className={classes.turn} data-role="assistant" data-streaming="true">
                  <div className={classes.turnIndex}>{String(messages.length + 1).padStart(2, '0')}</div>
                  <div className={classes.turnBody}>
                    <HtmlContent content={streamingMessage} />
                    <span className={classes.caret} aria-hidden="true" />
                  </div>
                </div>
              )}

              {isMutating && !streamingMessage && (
                <div className={classes.turn} data-role="assistant" data-pending="true">
                  <div className={classes.turnIndex}>{String(messages.length + 1).padStart(2, '0')}</div>
                  <div className={classes.turnBody}>
                    <span className={classes.signal} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {!hasConversation && (
            <div className={classes.prompts}>
              <div className={classes.promptsTitle}>{t('suggestedQuestionsTitle')}</div>
              <div className={classes.promptList}>
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    type="button"
                    className={classes.prompt}
                    onClick={() => handleSendMessage(query)}
                    disabled={turnstileError || (captchaMode === 'mount' && !turnstileToken)}
                  >
                    <span className={classes.promptIndex}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={classes.promptText}>{query}</span>
                    <span className={classes.promptArrow} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 1.5L7.5 6L3 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} ref={formRef} className={classes.form}>
            <div className={classes.inputRow}>
              <span className={classes.inputGlyph} aria-hidden="true">&gt;</span>
              <TextInput
                placeholder={t('inputPlaceholder')}
                value={input}
                onChange={e => setInput(e.target.value)}
                className={classes.inputField}
                radius={0}
                variant="unstyled"
                disabled={isMutating}
              />
              <Button
                type="submit"
                radius={0}
                className={classes.send}
                loading={isMutating}
                disabled={!input.trim() || !turnstileToken}
                aria-label={t('inputPlaceholder')}
              >
                <IconArrowRight size={16} />
              </Button>
            </div>
          </form>
        </div>

        {/* Compliance strip: the gate and its explanation share one line, so the
            panel closes on the input rather than on an empty half-row. */}
        <div className={classes.foot}>
          <span className={classes.footnote}>{t('gatewayInfo')}</span>
          {captchaMode === 'mount' && (
            <div className={classes.gate}>
              <Turnstile
                turnstileSiteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY || ''}
                callback={(token: string) => {
                  setTurnstileToken(token);
                  setTurnstileError(false);
                }}
                errorCallback={() => {
                  setTurnstileError(true);
                  setTurnstileToken(null);
                }}
                theme="auto"
                size="normal"
              />
            </div>
          )}
          {captchaMode === 'skip' && (
            <span className={classes.simulator}>
              {t('devModeCaptchaDisabled')}
            </span>
          )}
        </div>
      </div>
    </Container>
  );
}
