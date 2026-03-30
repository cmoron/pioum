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

  useEffect(() => {
    if (open) {
      api
        .getGroupTags(groupId)
        .then(({ tags }) => setGroupTags(tags))
        .catch(() => {});
    }
  }, [open, groupId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="relative inline-flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={() => handleRemove(tag.id)}
        />
      ))}

      {canAddMore && (
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-500 hover:text-primary-700 transition-colors border border-primary-200"
          title="Ajouter un tag"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-1 bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 p-3 z-50 min-w-[200px]"
        >
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          {availableGroupTags.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-primary-600 mb-1">
                Tags du groupe
              </p>
              <div className="flex flex-wrap gap-1">
                {availableGroupTags.map((gt) => (
                  <button
                    key={gt.id}
                    onClick={() => handleAddGroupTag(gt.id)}
                    disabled={loading}
                    className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full border border-primary-200 hover:bg-primary-100 transition-colors disabled:opacity-50"
                  >
                    {gt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-primary-600 mb-1">
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
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                maxLength={MAX_FREE_TEXT_LENGTH}
                placeholder="Ex: musique, détour..."
                className="flex-1 text-xs px-2 py-1 rounded-warm border border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !freeText.trim()}
                className="text-xs bg-primary-700 text-white px-2 py-1 rounded-warm hover:bg-primary-800 transition-colors disabled:opacity-50"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
