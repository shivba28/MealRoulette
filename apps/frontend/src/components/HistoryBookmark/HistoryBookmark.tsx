import { forwardRef } from 'react';
import { History } from 'lucide-react';

export interface HistoryBookmarkProps {
  count?: number;
  onClick: () => void;
  /** Mirrors history panel open state for accessibility. */
  historyOpen?: boolean;
}

/**
 * Fixed right-edge control styled as a ribbon bookmark (meal history).
 */
export const HistoryBookmark = forwardRef<HTMLButtonElement, HistoryBookmarkProps>(function HistoryBookmark(
  { onClick, historyOpen = false },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className="history-bookmark"
      onClick={onClick}
      aria-label="Meal history"
      aria-expanded={historyOpen}
    >
      <span className="history-bookmark__fold" aria-hidden />
      <span className="history-bookmark__icon-wrap">
        <History className="history-bookmark__icon" size={20} strokeWidth={2.25} aria-hidden />
      </span>
      {/* {count > 0 && (
        <span className="history-bookmark__badge" aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      )} */}
    </button>
  );
});
