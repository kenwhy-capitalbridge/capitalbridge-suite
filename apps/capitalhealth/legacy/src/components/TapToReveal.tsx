import * as React from 'react';
import { createPortal } from 'react-dom';

const GOLD = '#FFCC6A';
/** Slightly lighter green than #0D3A1D for tooltip; portal-rendered to avoid clipping */
const TOOLTIP_BG = '#1a4d2e';
const CAUTION_RED = '#DD524C';
const TOOLTIP_Z = 9999;
const EDGE_PAD = 16;
/** Tooltip max width: responsive (90vw on small screens, up to 380px on large) */
const TOOLTIP_MAX_W_PX = 380;

/** Only one tooltip open at a time; click outside closes it */
const TapToRevealContext = React.createContext<{
  activeId: string | null;
  setActiveId: (id: string | null) => void;
} | null>(null);

export const TapToRevealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return (
    <TapToRevealContext.Provider value={value}>
      {children}
    </TapToRevealContext.Provider>
  );
};

type Props = {
  /** Explanation shown when revealed. Use \n for line breaks when compact is true. */
  explanation: string;
  /** 'info' = small ⓘ (gold); 'caution' = big ⚠ (red) */
  variant?: 'info' | 'caution';
  /** Optional class for the wrapper */
  className?: string;
  /** Accessible label for the icon button */
  ariaLabel?: string;
  /** Smaller max-width and multi-line (pre-line) for short tooltips */
  compact?: boolean;
};

const COMPACT_MAX_W_PX = 260;

export const TapToReveal: React.FC<Props> = ({
  explanation,
  variant = 'info',
  className = '',
  ariaLabel,
  compact = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const tooltipRef = React.useRef<HTMLSpanElement>(null);
  const id = React.useId();
  const ctx = React.useContext(TapToRevealContext);
  const label = ariaLabel ?? (variant === 'caution' ? 'Caution: tap to reveal' : 'Info: tap to reveal');
  const isCaution = variant === 'caution';

  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  // Only one tooltip open: when another becomes active, close this one
  React.useEffect(() => {
    if (ctx && ctx.activeId !== null && ctx.activeId !== id && open) {
      setOpen(false);
    }
  }, [ctx?.activeId, id, open]);

  // Click outside: close when user clicks anywhere except this button or this tooltip
  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || tooltipRef.current?.contains(t)) return;
      setOpen(false);
      ctx?.setActiveId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, ctx]);

  const handleToggle = React.useCallback(() => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const maxW = Math.min(compact ? COMPACT_MAX_W_PX : TOOLTIP_MAX_W_PX, Math.max(240, vw * 0.9));
      let left = rect.left;
      left = Math.max(EDGE_PAD, Math.min(left, vw - maxW - EDGE_PAD));
      setPosition({ top: rect.bottom + 6, left });
    }
    setOpen((o) => {
      const next = !o;
      if (ctx) {
        ctx.setActiveId(next ? id : null);
      }
      return next;
    });
  }, [open, id, ctx, compact]);

  // Reposition tooltip after mount so it stays 16px from viewport edges (viewport-relative, no clipping)
  React.useLayoutEffect(() => {
    if (!open || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = Math.max(EDGE_PAD, Math.min(position.left, vw - el.offsetWidth - EDGE_PAD));
    let top = position.top;
    if (top + el.offsetHeight > vh - EDGE_PAD) top = Math.max(EDGE_PAD, vh - el.offsetHeight - EDGE_PAD);
    if (left !== position.left || top !== position.top) {
      setPosition({ left, top });
    }
  }, [open]);

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        onBlur={() => {}}
        className={`inline-flex items-center justify-center rounded-full p-0 border-0 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer select-none ${isCaution ? 'focus-visible:ring-[#DD524C]' : 'focus-visible:ring-[#FFCC6A]'}`}
        style={{ color: isCaution ? CAUTION_RED : GOLD }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {isCaution ? (
          <span className="text-lg sm:text-xl leading-none font-bold" aria-hidden>⚠</span>
        ) : (
          <span className="text-[10px] sm:text-xs leading-none font-bold opacity-95" aria-hidden>ⓘ</span>
        )}
      </button>
      {open &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className="fixed border border-[#FFCC6A] whitespace-normal text-left text-[#F6F5F1] shadow-lg"
            style={{
              backgroundColor: TOOLTIP_BG,
              zIndex: TOOLTIP_Z,
              top: position.top,
              left: position.left,
              padding: '12px 16px',
              borderRadius: 12,
              maxWidth: compact ? 'min(90vw, 260px)' : 'min(90vw, 380px)',
              width: 'max-content',
              minWidth: compact ? undefined : 'min(200px, 85vw)',
              fontSize: 'clamp(11px, 1.2vw, 13px)',
              lineHeight: 1.4,
              whiteSpace: compact ? 'pre-line' : undefined,
            }}
          >
            {explanation}
          </span>,
          document.body
        )}
    </span>
  );
};
