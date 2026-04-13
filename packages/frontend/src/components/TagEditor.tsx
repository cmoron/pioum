import { useState, useEffect, useRef } from "react";
import { GroupTag, PassengerTag, CarTag, api } from "../lib/api";
import { TagBadge } from "./TagBadge";

const MAX_TAGS = 3;
const MAX_FREE_TEXT_LENGTH = 50;

interface TagEditorProps {
  tags: (PassengerTag | CarTag)[];
  groupId: string;
  onAdd: (data: { groupTagId?: string; freeText?: string }) => Promise<void>;
  onRemove: (tagId: string) => Promise<void>;
}

export function TagEditor({ tags, groupId, onAdd, onRemove }: TagEditorProps) {
  const [open, setOpen] = useState(false);
  const [groupTags, setGroupTags] = useState<GroupTag[]>([]);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      api
        .getGroupTags(groupId)
        .then(({ tags }) => setGroupTags(tags))
        .catch(() => {});
      // Focus the input shortly after opening (after layout settles)
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setError(null);
      setFreeText("");
    }
  }, [open, groupId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKey);
      };
    }
  }, [open]);

  const usedGroupTagIds = new Set(
    tags.map((t) => t.groupTagId).filter(Boolean),
  );
  const availableGroupTags = groupTags.filter(
    (gt) => !usedGroupTagIds.has(gt.id),
  );
  const canAddMore = tags.length < MAX_TAGS;

  const handleAddGroupTag = async (groupTagId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onAdd({ groupTagId });
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFreeText = async () => {
    const trimmed = freeText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onAdd({ freeText: trimmed });
      setFreeText("");
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (tagId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onRemove(tagId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={() => handleRemove(tag.id)}
        />
      ))}

      {canAddMore && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          aria-expanded={open}
          aria-label="Ajouter un tag"
          title="Ajouter un tag"
          className={`inline-flex items-center gap-0.5 text-[11px] leading-tight font-medium px-2 py-0.5 rounded-full border border-dashed transition-colors disabled:opacity-50 ${
            open
              ? "bg-primary-700 text-white border-primary-700"
              : "bg-transparent text-primary-600 border-primary-300 hover:border-primary-500 hover:text-primary-800 hover:bg-primary-50"
          }`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 5v14m7-7H5"
            />
          </svg>
          {tags.length === 0 && <span>tag</span>}
        </button>
      )}

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          className="absolute top-full right-0 mt-1.5 bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 p-3 z-50 w-[260px] max-w-[calc(100vw-1.5rem)]"
        >
          {error && (
            <p className="text-xs text-red-600 mb-2 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </p>
          )}

          {availableGroupTags.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-wide mb-1.5">
                Tags du groupe
              </p>
              <div className="flex flex-wrap gap-1">
                {availableGroupTags.map((gt) => (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => handleAddGroupTag(gt.id)}
                    disabled={loading}
                    className="text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200 px-2 py-1 rounded-full hover:bg-primary-200 active:bg-primary-300 transition-colors disabled:opacity-50"
                  >
                    {gt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-wide mb-1.5">
              Texte libre
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddFreeText();
              }}
              className="flex gap-1"
            >
              <input
                ref={inputRef}
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                maxLength={MAX_FREE_TEXT_LENGTH}
                placeholder="Ex: musique, détour..."
                className="flex-1 min-w-0 text-xs px-2 py-1 rounded-warm border border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !freeText.trim()}
                className="text-xs font-medium bg-primary-700 text-white px-3 py-1 rounded-warm hover:bg-primary-800 active:bg-primary-900 transition-colors disabled:opacity-50"
              >
                OK
              </button>
            </form>
            {freeText.length > 0 && (
              <p className="text-[10px] text-primary-500 mt-1 text-right">
                {freeText.length}/{MAX_FREE_TEXT_LENGTH}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
