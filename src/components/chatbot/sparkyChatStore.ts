export type SparkyAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type SparkyChatState = {
  open: boolean;
  anchor: SparkyAnchor | null;
};

type Listener = (state: SparkyChatState) => void;

let open = false;
let anchor: SparkyAnchor | null = null;
const listeners = new Set<Listener>();

function emit() {
  const snapshot: SparkyChatState = { open, anchor };
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeSparkyChat(listener: Listener) {
  listeners.add(listener);
  listener({ open, anchor });
  return () => {
    listeners.delete(listener);
  };
}

export function setSparkyChatOpen(next: boolean, nextAnchor?: SparkyAnchor | null) {
  open = next;
  if (!next) {
    anchor = null;
  } else if (nextAnchor !== undefined) {
    anchor = nextAnchor;
  }
  emit();
}

export function toggleSparkyChat(nextAnchor?: SparkyAnchor | null) {
  if (open) {
    setSparkyChatOpen(false);
    return;
  }
  setSparkyChatOpen(true, nextAnchor ?? null);
}

export function anchorFromElement(el: HTMLElement): SparkyAnchor {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}
