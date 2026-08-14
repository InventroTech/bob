import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Send, X } from 'lucide-react';
import { chatbotService, type ChatMessage, type ChatSource } from '@/lib/api/services/chatbot';
import { getTenantSlug } from '@/lib/api/config';
import { cn } from '@/lib/utils';
import ChatMarkdown from '@/components/chatbot/ChatMarkdown';
import { useAuth } from '@/hooks/useAuth';
import {
  type SparkyAnchor,
  anchorFromElement,
  setSparkyChatOpen,
  subscribeSparkyChat,
  toggleSparkyChat,
} from '@/components/chatbot/sparkyChatStore';

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

const SPARKY_WELCOME_TEXT = 'Hi, Do you need anything?';
const SPARKY_SAY_HI_KEY = 'pyro_sparky_say_hi';

function storageKey(): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_chat_conversation_id:${slug}`;
}

function preferNewKey(): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_chat_prefer_new:${slug}`;
}

const SPARKY_PANEL_MAX_WIDTH = 380;
const SPARKY_PANEL_MAX_HEIGHT = 560;
const SPARKY_VIEWPORT_GUTTER = 8;

function sparkyPanelWidth(): number {
  if (typeof window === 'undefined') return SPARKY_PANEL_MAX_WIDTH;
  return Math.min(SPARKY_PANEL_MAX_WIDTH, window.innerWidth - SPARKY_VIEWPORT_GUTTER * 2);
}

type SparkyPanelBox = { left: number; top: number; width: number; height: number };

function clampSparkyPanelBox(anchor: SparkyAnchor | null): SparkyPanelBox {
  if (typeof window === 'undefined') {
    return { left: 0, top: 8, width: SPARKY_PANEL_MAX_WIDTH, height: SPARKY_PANEL_MAX_HEIGHT };
  }

  const width = sparkyPanelWidth();
  const maxHeight = Math.min(SPARKY_PANEL_MAX_HEIGHT, Math.round(window.innerHeight * 0.7));

  if (!anchor) {
    const height = Math.max(220, Math.min(maxHeight, window.innerHeight - SPARKY_VIEWPORT_GUTTER * 2));
    return {
      left: Math.max(SPARKY_VIEWPORT_GUTTER, window.innerWidth - width - SPARKY_VIEWPORT_GUTTER),
      top: Math.max(SPARKY_VIEWPORT_GUTTER, window.innerHeight - height - SPARKY_VIEWPORT_GUTTER),
      width,
      height,
    };
  }

  const preferredLeft = anchor.right + SPARKY_VIEWPORT_GUTTER;
  const left =
    preferredLeft + width <= window.innerWidth - SPARKY_VIEWPORT_GUTTER
      ? preferredLeft
      : Math.max(SPARKY_VIEWPORT_GUTTER, window.innerWidth - width - SPARKY_VIEWPORT_GUTTER);

  const height = Math.max(
    220,
    Math.min(maxHeight, Math.max(anchor.bottom - SPARKY_VIEWPORT_GUTTER, window.innerHeight * 0.55))
  );
  const preferredTop = anchor.bottom - height;
  const top = Math.min(
    Math.max(SPARKY_VIEWPORT_GUTTER, preferredTop),
    window.innerHeight - height - SPARKY_VIEWPORT_GUTTER
  );

  return { left, top, width, height };
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

function welcomeTipKey(userId: string, loginStamp: string): string {
  const slug = getTenantSlug() || 'default';
  return `pyro_sparky_welcome_tip:${slug}:${userId}:${loginStamp}`;
}

function useSparkyWelcomeTip() {
  const { user, session } = useAuth();
  const [showTip, setShowTip] = useState(false);
  const loginStamp = loginStampFromToken(session?.access_token);

  useEffect(() => {
    if (!user?.id || !loginStamp) {
      setShowTip(false);
      return;
    }
    try {
      setShowTip(window.localStorage.getItem(welcomeTipKey(user.id, loginStamp)) !== '1');
    } catch {
      setShowTip(true);
    }
  }, [user?.id, loginStamp]);

  const dismissWelcomeTip = useCallback(
    (sayHiInChat = false) => {
      if (user?.id && loginStamp) {
        try {
          window.localStorage.setItem(welcomeTipKey(user.id, loginStamp), '1');
        } catch {
          // ignore
        }
      }
      if (sayHiInChat) {
        try {
          window.sessionStorage.setItem(SPARKY_SAY_HI_KEY, '1');
        } catch {
          // ignore
        }
      }
      setShowTip(false);
    },
    [user?.id, loginStamp]
  );

  return { showTip, dismissWelcomeTip };
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

function SparkyWelcomeBubble({
  onOpen,
  onDismiss,
  placement = 'above',
}: {
  onOpen: () => void;
  onDismiss: () => void;
  placement?: 'above' | 'right';
}) {
  return (
    <div
      className={cn(
        'absolute z-30 animate-sparky-bubble-in',
        placement === 'right'
          ? 'left-full top-1/2 ml-3 -translate-y-1/2'
          : 'bottom-full left-0 mb-3'
      )}
    >
      <div className="relative max-w-[230px]">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full rounded-[22px] border-[3px] border-white bg-gradient-to-b from-[#F4F8FF] to-white px-4 py-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.16)]"
        >
          <p className="pr-4 text-sm font-semibold leading-snug text-[#1A3673]">
            Hi, Do you need anything?
          </p>
        </button>
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute right-1.5 top-1.5 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
        <span
          aria-hidden
          className={cn(
            'absolute h-3.5 w-3.5 rotate-45 border-white bg-white shadow-[2px_2px_6px_rgba(15,23,42,0.08)]',
            placement === 'right'
              ? 'left-0 top-1/2 -ml-[8px] -translate-y-1/2 border-b-[3px] border-l-[3px]'
              : 'left-5 -bottom-[8px] border-b-[3px] border-r-[3px]'
          )}
        />
      </div>
    </div>
  );
}

export function SparkySidebarButton({
  collapsed = false,
  className,
  onToggle,
  placePanelAway = false,
}: {
  collapsed?: boolean;
  className?: string;
  onToggle?: () => void;
  placePanelAway?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { showTip, dismissWelcomeTip } = useSparkyWelcomeTip();

  useEffect(() => subscribeSparkyChat((state) => setOpen(state.open)), []);

  const openSparky = () => {
    if (open) {
      setSparkyChatOpen(false);
      return;
    }
    // Only arm the in-chat greeting when opening from the welcome bubble / first login.
    dismissWelcomeTip(showTip);
    const nextAnchor =
      placePanelAway || !buttonRef.current ? null : anchorFromElement(buttonRef.current);
    onToggle?.();
    toggleSparkyChat(nextAnchor);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close Sparky' : 'Ask Sparky'}
        aria-expanded={open}
        onClick={openSparky}
        className={cn(
          'flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition',
          collapsed ? 'justify-center' : 'gap-3',
          open
            ? 'bg-[#1A3673] text-white shadow-[0_2px_10px_rgba(26,54,115,0.28)]'
            : 'text-gray-600 hover:bg-gray-50',
          className
        )}
      >
        <div className="relative h-8 w-8 shrink-0">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center overflow-hidden rounded-full',
              open ? 'bg-white/15' : 'bg-gray-100',
              showTip && !open && 'animate-sparky-bob'
            )}
          >
            <SparkyAvatar
              className={cn('h-7 w-7', showTip && !open && 'animate-sparky-wave')}
              alt=""
            />
          </div>
        </div>
        {!collapsed && <span>Sparky</span>}
      </button>
      {showTip && !open ? (
        <SparkyWelcomeBubble
          placement={collapsed ? 'right' : 'above'}
          onOpen={openSparky}
          onDismiss={() => dismissWelcomeTip(false)}
        />
      ) : null}
    </div>
  );
}

export function SparkyHeaderButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { showTip, dismissWelcomeTip } = useSparkyWelcomeTip();

  useEffect(() => subscribeSparkyChat((state) => setOpen(state.open)), []);

  const openSparky = () => {
    if (open) {
      setSparkyChatOpen(false);
      return;
    }
    dismissWelcomeTip(showTip);
    toggleSparkyChat(buttonRef.current ? anchorFromElement(buttonRef.current) : null);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close Sparky' : 'Ask Sparky'}
        aria-expanded={open}
        onClick={openSparky}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full border bg-white transition',
          open ? 'ring-2 ring-[#1A3673]' : 'hover:bg-gray-50',
          showTip && !open && 'animate-sparky-bob'
        )}
      >
        <SparkyAvatar
          className={cn(
            'h-8 w-8 overflow-hidden rounded-full',
            showTip && !open && 'animate-sparky-wave'
          )}
          alt=""
        />
      </button>
      {showTip && !open ? (
        <SparkyWelcomeBubble
          placement="above"
          onOpen={openSparky}
          onDismiss={() => dismissWelcomeTip(false)}
        />
      ) : null}
    </div>
  );
}

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<SparkyAnchor | null>(null);
  const [, setLayoutTick] = useState(0);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyLoadedRef = useRef(false);
  const sessionGenRef = useRef(0);

  useEffect(
    () =>
      subscribeSparkyChat((state) => {
        setOpen(state.open);
        setAnchor(state.anchor);
      }),
    []
  );

  useEffect(() => {
    if (!open || loadingHistory || messages.length > 0) return;
    try {
      if (window.sessionStorage.getItem(SPARKY_SAY_HI_KEY) !== '1') return;
      window.sessionStorage.removeItem(SPARKY_SAY_HI_KEY);
    } catch {
      return;
    }
    setMessages([
      {
        id: 'sparky-welcome',
        role: 'assistant',
        content: SPARKY_WELCOME_TEXT,
      },
    ]);
  }, [open, loadingHistory, messages.length]);

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
      if (gen !== sessionGenRef.current) return false;
      setConversationId(id);
      setMessages(toUiMessages(rows));
      persistConversationId(id);
      writePreferNew(false);
      return true;
    },
    [persistConversationId]
  );

  useEffect(() => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    let cancelled = false;
    const restore = async () => {
      const gen = sessionGenRef.current;

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
        if (gen === sessionGenRef.current) {
          persistConversationId(null);
          setConversationId(null);
          setMessages([]);
        }
      } finally {
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

  useEffect(() => {
    const onResize = () => setLayoutTick((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const chatPanel = open ? (
    <div
      className={cn(
        'pointer-events-auto flex h-full w-full min-w-0 max-w-full box-border',
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
            onClick={() => setSparkyChatOpen(false)}
            className="rounded-md p-1 hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-muted/30 px-3 py-3">
        {loadingHistory && messages.length === 0 && (
          <div className="flex items-center gap-2 px-1 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading previous chat…
          </div>
        )}

        {!loadingHistory && !messages.some((m) => m.role === 'user') && (
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
        className="flex w-full min-w-0 max-w-full items-end gap-2 border-t border-border bg-background p-3"
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
          className="max-h-28 min-h-[40px] min-w-0 w-full flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
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
  ) : null;

  const panelBox = open ? clampSparkyPanelBox(anchor) : null;

  if (!open || !panelBox) return null;

  return (
    <div
      className="pointer-events-auto fixed z-[80]"
      style={{
        left: panelBox.left,
        top: panelBox.top,
        width: panelBox.width,
        height: panelBox.height,
      }}
    >
      {chatPanel}
    </div>
  );
};

export default ChatWidget;
