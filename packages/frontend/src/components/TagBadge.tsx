import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { PassengerTag, CarTag, TagReaction } from "../lib/api";
import { Avatar } from "./Avatar";

const EMOJI_OPTIONS = [
  "\u{1F600}", // 😀
  "\u{1F602}", // 😂
  "\u{1F970}", // 🥰
  "\u{1F971}", // 🥱
  "\u{1F92C}", // 🤬
  "\u{1F92F}", // 🤯
  "\u{1F62D}", // 😭
  "\u{1F62E}", // 😮
  "\u{1F921}", // 🤡
  "\u{1F4A9}", // 💩
  "\u{1F44D}", // 👍
  "\u{1F4AA}", // 💪
  "\u{1F44A}", // 👊
  "\u{2764}\u{FE0F}", // ❤️
  "\u{1F346}", // 🍆
  "\u{1F4A6}", // 💦
  "\u{1F3BA}", // 🎺
  "\u{1F483}", // 💃
  "\u{1F437}", // 🐷
  "\u{1F32D}", // 🌭
  "\u{1F348}", // 🍈
  "\u{2705}", // ✅
  "\u{1F308}", // 🌈
];

const POPOVER_WIDTH = 260;
const POPOVER_HEIGHT_ESTIMATE = 200;
const VIEWPORT_PADDING = 8;

type PopoverState =
  | { kind: "picker" }
  | { kind: "reactors"; emoji: string }
  | null;

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
  const [pop, setPop] = useState<PopoverState>(null);
  const [popPos, setPopPos] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  // Element that opened the current popover (tag span or a chip button)
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aggregated = aggregateReactions(tag.reactions, currentUserId);
  const reactorsList =
    pop?.kind === "reactors"
      ? (tag.reactions ?? []).filter((r) => r.emoji === pop.emoji)
      : [];

  const updatePopPosition = useCallback(() => {
    const trigger = activeTriggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Prefer below the trigger; flip above if no room
    let top = rect.bottom + 4;
    if (top + POPOVER_HEIGHT_ESTIMATE > viewportH - VIEWPORT_PADDING) {
      top = Math.max(VIEWPORT_PADDING, rect.top - POPOVER_HEIGHT_ESTIMATE - 4);
    }
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_PADDING),
      viewportW - POPOVER_WIDTH - VIEWPORT_PADDING,
    );
    setPopPos({ top, left });
  }, []);

  useEffect(() => {
    if (!pop) return;
    updatePopPosition();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !popRef.current?.contains(target) &&
        !activeTriggerRef.current?.contains(target)
      ) {
        setPop(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPop(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePopPosition);
    window.addEventListener("scroll", updatePopPosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePopPosition);
      window.removeEventListener("scroll", updatePopPosition, true);
    };
  }, [pop, updatePopPosition]);

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!onReact || loading) return;
      setLoading(true);
      try {
        await onReact(emoji);
      } finally {
        setLoading(false);
        setPop(null);
      }
    },
    [onReact, loading],
  );

  const handleTagClick = useCallback(() => {
    if (!onReact) return;
    activeTriggerRef.current = triggerRef.current;
    setPop((prev) => (prev?.kind === "picker" ? null : { kind: "picker" }));
  }, [onReact]);

  const handleChipClick = useCallback(
    (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      activeTriggerRef.current = e.currentTarget;
      setPop({ kind: "reactors", emoji });
    },
    [],
  );

  const handleTouchStart = useCallback(() => {
    if (!onReact) return;
    longPressTimer.current = setTimeout(() => {
      activeTriggerRef.current = triggerRef.current;
      setPop({ kind: "picker" });
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
    <span className="inline-flex flex-col items-start">
      <span
        ref={triggerRef}
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

      {/* Aggregated reaction chips — click opens the reactors list */}
      {aggregated.size > 0 && (
        <span className="inline-flex gap-0.5 mt-0.5">
          {[...aggregated.entries()].map(([emoji, { count, reacted }]) => (
            <button
              key={emoji}
              onClick={(e) => handleChipClick(emoji, e)}
              className={`inline-flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0 rounded-full border transition-colors ${
                reacted
                  ? "bg-primary-200 border-primary-400"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              title="Voir qui a réagi"
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-gray-600">{count}</span>}
            </button>
          ))}
        </span>
      )}

      {/* Emoji picker popover — portaled so it escapes ancestor overflow */}
      {pop?.kind === "picker" &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            className="fixed bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 p-2 z-50 grid grid-cols-6 gap-1"
            style={{
              top: popPos.top,
              left: popPos.left,
              width: POPOVER_WIDTH,
            }}
            data-testid="emoji-picker"
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                disabled={loading}
                className="text-lg hover:scale-125 transition-transform disabled:opacity-50 aspect-square flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {/* Reactors popover — WhatsApp-style list of users who reacted */}
      {pop?.kind === "reactors" &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            className="fixed bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 p-2 z-50 max-h-[60vh] overflow-y-auto"
            style={{
              top: popPos.top,
              left: popPos.left,
              width: POPOVER_WIDTH,
            }}
            data-testid="reactors-popover"
          >
            <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-wide mb-1.5 px-1">
              <span className="text-base align-middle">{pop.emoji}</span>
              <span className="ml-1.5 align-middle">
                {reactorsList.length}
              </span>
            </p>
            <ul className="flex flex-col gap-0.5">
              {reactorsList.map((r) => {
                const isMe = r.userId === currentUserId;
                const user = r.user;
                const name = user?.name ?? (isMe ? "Toi" : "Utilisateur");
                if (isMe) {
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => handleReact(r.emoji)}
                        disabled={loading || !onReact}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-warm bg-primary-50 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
                      >
                        {user && <Avatar user={user} size="xs" />}
                        <span className="flex-1 text-sm text-primary-800 font-medium truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-red-600 flex-shrink-0">
                          Retirer
                        </span>
                      </button>
                    </li>
                  );
                }
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 px-2 py-1.5"
                  >
                    {user && <Avatar user={user} size="xs" />}
                    <span className="flex-1 text-sm text-primary-800 truncate">
                      {name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </span>
  );
}
