import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { chatbotService, type ChatSource } from '@/lib/api/services/chatbot';
import { cn } from '@/lib/utils';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  sources?: ChatSource[];
};

const SUGGESTIONS = [
  'Show analytics',
  'Show billing for this month',
  'Create a page named Ops Home',
  'List my pages',
];

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages, sending]);

  const pageContext = useCallback(() => {
    return {
      route: location.pathname,
    };
  }, [location.pathname]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;

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
        setConversationId(res.conversation_id);
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
        const ax = err as { response?: { data?: { error?: string } }; message?: string };
        const msg =
          ax?.response?.data?.error ||
          ax?.message ||
          'Could not reach the assistant. Try again.';
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(message);
      } finally {
        setSending(false);
      }
    },
    [conversationId, pageContext, sending]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput('');
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
          <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Pyro Assistant</p>
                <p className="truncate text-[11px] opacity-80">CRM · ERP · product help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startNew}
                className="rounded-md px-2 py-1 text-[11px] font-medium hover:bg-primary-foreground/15"
              >
                New
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-primary-foreground/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-3 px-1 py-2">
                <p className="text-sm text-muted-foreground">
                  Ask about product workflows or live CRM/ERP data.
                </p>
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
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground'
                  )}
                >
                  {m.content}
                  {m.role === 'assistant' && m.mode ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide opacity-60">
                      {m.mode}
                      {m.sources?.length ? ` · ${m.sources.length} source(s)` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
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
              placeholder="Ask anything…"
              disabled={sending}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Close Pyro assistant' : 'Open Pyro assistant'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg transition hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
