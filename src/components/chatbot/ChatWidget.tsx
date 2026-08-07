import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Send, X } from 'lucide-react';
import { chatbotService, type ChatMessage, type ChatSource } from '@/lib/api/services/chatbot';
import { getTenantSlug } from '@/lib/api/config';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import ChatMarkdown from '@/components/chatbot/ChatMarkdown';

const SPARKY_AVATAR = '/chatbot/sparky.png';
const SPARKY_NAME = 'Sparky';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  sources?: ChatSource[];
};

const SUGGESTIONS = [
  'Show analytics',
  'Create a page named Ops Home',
  'List my pages',
];

function storageKey(): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_chat_conversation_id:${slug}`;
}

function preferNewKey(): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_chat_prefer_new:${slug}`;
}

/** Stable-ish login id from JWT `iat` — changes on new login, not on page refresh/token refresh. */
function loginStampFromToken(accessToken?: string | null): string | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1] || ''));
    if (payload?.iat == null) return null;
    return String(payload.iat);
  } catch {
    return null;
  }
}

function tipDismissedKey(userId: string, loginStamp: string): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_sparky_tip_dismissed:${slug}:${userId}:${loginStamp}`;
}

function readPreferNew(): boolean {
  try {
    return window.localStorage.getItem(preferNewKey()) === '1';
  } catch {
    return false;
  }
}

function writePreferNew(value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(preferNewKey(), '1');
    } else {
      window.localStorage.removeItem(preferNewKey());
    }
  } catch {
    // ignore
  }
}

function isTipDismissedForLogin(userId: string, loginStamp: string): boolean {
  try {
    return window.localStorage.getItem(tipDismissedKey(userId, loginStamp)) === '1';
  } catch {
    return false;
  }
}

function dismissTipForLogin(userId: string, loginStamp: string) {
  try {
    window.localStorage.setItem(tipDismissedKey(userId, loginStamp), '1');
  } catch {
    // ignore
  }
}

function toUiMessages(rows: ChatMessage[]): UiMessage[] {
  return rows
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      mode: m.mode,
      sources: m.sources,
    }));
}

const SparkyAvatar: React.FC<{ className?: string; alt?: string }> = ({
  className,
  alt = SPARKY_NAME,
}) => (
  <img
    src={SPARKY_AVATAR}
    alt={alt}
    className={cn('object-contain', className)}
    draggable={false}
  />
);

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [showWelcomeTip, setShowWelcomeTip] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyLoadedRef = useRef(false);
  // Bumps when user clicks New so in-flight history restores are ignored.
  const sessionGenRef = useRef(0);
  const loginStamp = loginStampFromToken(session?.access_token);

  useEffect(() => {
    if (!user?.id || !loginStamp) {
      setShowWelcomeTip(false);
      return;
    }
    // Show once per login (JWT iat). Hidden after dismiss until next login.
    setShowWelcomeTip(!isTipDismissedForLogin(user.id, loginStamp));
  }, [user?.id, loginStamp]);

  const dismissWelcomeTip = useCallback(() => {
    if (user?.id && loginStamp) {
      dismissTipForLogin(user.id, loginStamp);
    }
    setShowWelcomeTip(false);
  }, [user?.id, loginStamp]);

  const openChat = useCallback(() => {
    dismissWelcomeTip();
    setOpen(true);
  }, [dismissWelcomeTip]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages, sending, loadingHistory]);

  const persistConversationId = useCallback((id: string | null) => {
    try {
      if (id) {
        window.localStorage.setItem(storageKey(), id);
      } else {
        window.localStorage.removeItem(storageKey());
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  const loadConversation = useCallback(
    async (id: string, gen: number) => {
      const rows = await chatbotService.getMessages(id);
      // User clicked New (or another restore superseded this one).
      if (gen !== sessionGenRef.current) return false;
      setConversationId(id);
      setMessages(toUiMessages(rows));
      persistConversationId(id);
      writePreferNew(false);
      return true;
    },
    [persistConversationId]
  );

  // Restore only the saved conversation id — never auto-pick "latest".
  useEffect(() => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    let cancelled = false;
    const restore = async () => {
      const gen = sessionGenRef.current;

      // Fresh "New chat" session — show empty UI immediately, skip network.
      if (readPreferNew()) {
        setLoadingHistory(false);
        setConversationId(null);
        setMessages([]);
        return;
      }

      let savedId: string | null = null;
      try {
        savedId = window.localStorage.getItem(storageKey());
      } catch {
        savedId = null;
      }

      // Nothing to restore.
      if (!savedId) {
        setLoadingHistory(false);
        return;
      }

      setLoadingHistory(true);
      setError(null);
      try {
        if (cancelled || gen !== sessionGenRef.current) return;
        const ok = await loadConversation(savedId, gen);
        if (!ok) return;
      } catch {
        // Stale id — start clean instead of pulling another thread.
        if (gen === sessionGenRef.current) {
          persistConversationId(null);
          setConversationId(null);
          setMessages([]);
        }
      } finally {
        // Always clear spinner for this generation (and no-ops if New already did).
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [loadConversation, persistConversationId]);

  const pageContext = useCallback(() => {
    return {
      route: location.pathname,
    };
  }, [location.pathname]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;

      const gen = sessionGenRef.current;
      setError(null);
      setSending(true);
      setInput('');
      const tempId = `local-${Date.now()}`;
      setMessages((prev) => [...prev, { id: tempId, role: 'user', content: message }]);

      try {
        const res = await chatbotService.ask({
          message,
          conversation_id: conversationId,
          page_context: pageContext(),
        });
        if (gen !== sessionGenRef.current) return;
        writePreferNew(false);
        setConversationId(res.conversation_id);
        persistConversationId(res.conversation_id);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          return [
            ...withoutTemp,
            {
              id: res.user_message.id,
              role: 'user',
              content: res.user_message.content,
            },
            {
              id: res.assistant_message.id,
              role: 'assistant',
              content: res.answer || res.assistant_message.content,
              mode: res.mode,
              sources: res.sources,
            },
          ];
        });
      } catch (err: unknown) {
        if (gen !== sessionGenRef.current) return;
        const ax = err as { response?: { data?: { error?: string } }; message?: string };
        const msg =
          ax?.response?.data?.error ||
          ax?.message ||
          'Could not reach Sparky. Try again.';
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(message);
      } finally {
        if (gen === sessionGenRef.current) setSending(false);
      }
    },
    [conversationId, pageContext, persistConversationId, sending]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const startNew = () => {
    // Invalidate any in-flight restore / ask applied after this click.
    sessionGenRef.current += 1;
    setLoadingHistory(false);
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput('');
    setSending(false);
    persistConversationId(null);
    writePreferNew(true);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      {open && (
        <div
          className={cn(
            'pointer-events-auto flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2rem))]',
            'flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border bg-[#1e4fd6] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/25">
                <SparkyAvatar className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{SPARKY_NAME}</p>
                <p className="truncate text-[11px] opacity-80">Your Pyro CRM · ERP helper</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startNew}
                className="rounded-md px-2 py-1 text-[11px] font-medium hover:bg-white/15"
              >
                New
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-3 py-3">
            {loadingHistory && messages.length === 0 && (
              <div className="flex items-center gap-2 px-1 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading previous chat…
              </div>
            )}

            {!loadingHistory && messages.length === 0 && (
              <div className="space-y-3 px-1 py-2">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={sending}
                      onClick={() => void send(s)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex gap-2',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'assistant' ? (
                  <SparkyAvatar className="mt-1 h-7 w-7 shrink-0" />
                ) : null}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'whitespace-pre-wrap bg-[#1e4fd6] text-white'
                      : 'border border-border bg-background text-foreground'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <ChatMarkdown content={m.content} />
                  ) : (
                    m.content
                  )}
                  {m.role === 'assistant' && (m.mode || m.sources?.length) ? (
                    <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.mode || 'answer'}
                      {m.sources?.length ? ` · ${m.sources.length} source(s)` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <SparkyAvatar className="h-5 w-5" />
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sparky is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t border-border bg-background p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask Sparky…"
              disabled={sending}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e4fd6] text-white disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      {!open && showWelcomeTip && (
        <button
          type="button"
          onClick={openChat}
          className={cn(
            'pointer-events-auto mb-1 animate-sparky-bubble-in',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4fd6]'
          )}
          aria-label="Ask Sparky anything"
        >
          <div
            className={cn(
              'relative animate-sparky-bubble motion-reduce:animate-none',
              'max-w-[220px] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-left',
              'text-sm font-medium text-[#1e4fd6] shadow-lg ring-1 ring-black/5'
            )}
          >
            <p>Hey! Anything you want to ask?</p>
            <span
              aria-hidden
              className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-white shadow-[1px_1px_0_0_rgba(0,0,0,0.06)]"
            />
          </div>
        </button>
      )}

      <button
        type="button"
        aria-label={open ? 'Close Sparky' : 'Open Sparky'}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openChat();
          }
        }}
        className={cn(
          'pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full',
          'bg-white shadow-lg ring-1 ring-black/5 transition hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4fd6]',
          !open && 'animate-sparky-bob motion-reduce:animate-none'
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-[#1e4fd6]" />
        ) : (
          <SparkyAvatar
            className="h-14 w-14 origin-[70%_70%] animate-sparky-wave motion-reduce:animate-none"
            alt="Open Sparky"
          />
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
