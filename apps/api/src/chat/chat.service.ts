import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import type { ChatRequestDto, ChatResponseStream } from './dto/chat.dto';

// The OpenCode chat adapter reports upstream failures (429, provider limits) as
// ordinary message text on an HTTP 200 response.
const UPSTREAM_ERROR = /^(?:OpenCode 回報錯誤|provider\.(?:rate-limit|go-limit|quota))/;

// Per-IP ceiling for the chat endpoint. Turnstile is verified when the browser
// manages to obtain a token, but the challenge does not complete everywhere (some
// clients, filter proxies and VPNs never get one), so the real spend control is
// this limiter rather than the captcha.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 15;
const recentRequests = new Map<string, number[]>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (recentRequests.get(ip) ?? []).filter(at => now - at < RATE_WINDOW_MS);

  if (hits.length >= RATE_MAX_REQUESTS) {
    recentRequests.set(ip, hits);
    return false;
  }

  hits.push(now);
  recentRequests.set(ip, hits);

  if (recentRequests.size > 5000) {
    for (const [key, times] of recentRequests) {
      if (times.length === 0 || now - times[times.length - 1] > RATE_WINDOW_MS) {
        recentRequests.delete(key);
      }
    }
  }

  return true;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly fallback: { client: OpenAI; model: string } | null;

  constructor() {
    // Any OpenAI-compatible endpoint can serve the chat: point CHAT_API_BASE_URL
    // at it with CHAT_API_KEY and CHAT_API_MODEL. Otherwise the Cloudflare AI
    // Gateway is used, which needs either unified-billing credits or a BYOK key
    // stored under the `default` alias.
    const ownBase = process.env.CHAT_API_BASE_URL;
    const gatewayBase = process.env.CF_ACCOUNT_ID
      ? `https://gateway.ai.cloudflare.com/v1/${process.env.CF_ACCOUNT_ID}/portfolio-ai-gateway/compat`
      : undefined;

    this.model = ownBase
      ? process.env.CHAT_API_MODEL || 'gpt-4o-mini'
      : 'groq/llama-3.3-70b-versatile';

    this.openai = new OpenAI({
      apiKey:
        (ownBase ? process.env.CHAT_API_KEY : undefined)
        || process.env.CLOUDFLARE_AI_GATEWAY_TOKEN
        || process.env.OPENAI_API_KEY
        || '',
      baseURL: ownBase || gatewayBase,
    });

    // Optional second backend, tried when the first one fails or reports an
    // upstream error as message text. Left unset on a single-backend deployment.
    const fallbackBase = process.env.CHAT_FALLBACK_BASE_URL;
    this.fallback = fallbackBase
      ? {
          client: new OpenAI({ apiKey: process.env.CHAT_FALLBACK_KEY || '', baseURL: fallbackBase }),
          model: process.env.CHAT_FALLBACK_MODEL || 'gpt-4o-mini',
        }
      : null;
  }

  async validateTurnstileToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '',
          response: token,
        }),
      });

      const data = (await response.json()) as { success: boolean };
      return data.success === true;
    } catch (error) {
      this.logger.error('Turnstile validation error:', error);
      return false;
    }
  }

  async *createChatStream(request: ChatRequestDto, clientIp = 'unknown'): AsyncGenerator<ChatResponseStream> {
    const { messages, turnstileToken } = request;

    if (!withinRateLimit(clientIp)) {
      throw new Error('Too many messages');
    }

    // CAPTCHA_DISABLED is an escape hatch for local stacks only. Never set it on a
    // publicly reachable deployment: it lets anyone spend the owner's AI credits.
    const captchaOff = process.env.NODE_ENV === 'development' || process.env.CAPTCHA_DISABLED === 'true';

    // A token is optional because the challenge cannot complete on every client;
    // one that is supplied still has to be genuine.
    if (!captchaOff && turnstileToken) {
      const isValidToken = await this.validateTurnstileToken(turnstileToken);
      if (!isValidToken) {
        throw new Error('Invalid Turnstile token');
      }
    }

    const systemPrompt = process.env.AI_SYSTEM_PROMPT?.replace(/\\n/g, '\n') || '';
    const request_ = {
      messages: [{ role: 'system' as const, content: systemPrompt }, ...messages],
      stream: true as const,
      temperature: 0.3,
    };

    const openStream = (client: OpenAI, model: string) =>
      client.chat.completions.create({ model, ...request_ }, {
        headers: { 'cf-aig-byok-alias': 'portfolio-chat' },
      });

    let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    try {
      stream = await openStream(this.openai, this.model);
    } catch (error) {
      if (!this.fallback) {
        throw error;
      }
      this.logger.warn(`chat backend failed, falling back: ${String(error)}`);
      stream = await openStream(this.fallback.client, this.fallback.model);
    }

    let first = true;
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (!content) {
        continue;
      }
      // The OpenCode chat adapter answers HTTP 200 and puts an upstream failure
      // (429, provider limit) in the message body, so it has to be sniffed here.
      if (first && this.fallback && UPSTREAM_ERROR.test(content)) {
        this.logger.warn(`chat upstream error, falling back: ${content.slice(0, 120)}`);
        const alt = await openStream(this.fallback.client, this.fallback.model);
        for await (const altChunk of alt) {
          const altContent = altChunk.choices[0]?.delta?.content || '';
          if (altContent) {
            yield { choices: [{ delta: { content: altContent } }] };
          }
        }
        yield { done: true };
        return;
      }
      first = false;
      yield {
        choices: [{ delta: { content } }],
      };
    }

    yield { done: true };
  }
}
