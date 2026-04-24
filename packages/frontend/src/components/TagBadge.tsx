import { useState, useEffect, useRef, useCallback } from "react";
import { PassengerTag, CarTag, TagReaction } from "../lib/api";

const EMOJI_OPTIONS = [
  "\u{1F44D}",
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F389}",
  "\u{1F525}",
  "\u{1F440}",
];

interface TagBadgeProps {
  readonly tag: PassengerTag | CarTag;
  readonly onRemove?: () => void;
  readonly onReact?: (emoji: string) => Promise<void>;
  readonly currentUserId?: string;
}

/** Group reactions by emoji: { "\u{1F44D}": { count, reacted } } */
function aggregateReactions(
  reactions: TagReaction[] | undefined,
  currentUserId?: string,
) {
  const map = new Map<string, { count: number; reacted: boolean }>();
  if (!reactions) return map;
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, reacted: false };
    entry.count++;
    if (r.userId === currentUserId) entry.reacted = true;
    map.set(r.emoji, entry);
  }
  return map;
}

export function TagBadge({
  tag,
  onRemove,
  onReact,
  currentUserId,
}: TagBadgeProps) {
  const label = tag.groupTag?.label ?? tag.freeText ?? "";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aggregated = aggregateReactions(tag.reactions, currentUserId);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!onReact || loading) return;
      setLoading(true);
      try {
        await onReact(emoji);
      } finally {
        setLoading(false);
        setPickerOpen(false);
      }
    },
    [onReact, loading],
  );

  const handleTagClick = useCallback(() => {
    if (onReact) setPickerOpen((prev) => !prev);
  }, [onReact]);

  const handleTouchStart = useCallback(() => {
    if (!onReact) return;
    longPressTimer.current = setTimeout(() => {
      setPickerOpen(true);
    }, 500);
  }, [onReact]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTagClick();
      }
    },
    [handleTagClick],
  );

  return (
    <span className="relative inline-flex flex-col items-start">
      <span
        role="button"
        tabIndex={0}
        className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full border border-primary-200 cursor-pointer select-none"
        onClick={handleTagClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <span className="max-w-[100px] truncate">{label}</span>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-primary-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Supprimer le tag"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>

      {/* Aggregated reaction chips */}
      {aggregated.size > 0 && (
        <span className="inline-flex gap-0.5 mt-0.5">
          {[...aggregated.entries()].map(([emoji, { count, reacted }]) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleReact(emoji);
              }}
              disabled={loading || !onReact}
              className={`inline-flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0 rounded-full border transition-colors ${
                reacted
                  ? "bg-primary-200 border-primary-400"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              title={reacted ? "Retirer ta r\u00e9action" : "R\u00e9agir"}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-gray-600">{count}</span>}
            </button>
          ))}
        </span>
      )}

      {/* Emoji picker popover */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-1 bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 p-1.5 z-50 flex gap-1"
          data-testid="emoji-picker"
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={loading}
              className="text-base hover:scale-125 transition-transform disabled:opacity-50 p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
