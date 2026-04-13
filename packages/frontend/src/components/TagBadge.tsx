import { PassengerTag, CarTag } from "../lib/api";

interface TagBadgeProps {
  tag: PassengerTag | CarTag;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const label = tag.groupTag?.label ?? tag.freeText ?? "";
  const isGroupTag = !!tag.groupTag;

  // Group tags: solid pill in the warm primary palette
  // Free text tags: outlined / lighter pill — visually a "note"
  const surface = isGroupTag
    ? "bg-primary-100 text-primary-800 border-primary-200"
    : "bg-white text-primary-700 border-primary-300";
  // Free-text tags often run longer than canonical group labels — give them more room
  const widthCap = isGroupTag ? "max-w-[160px]" : "max-w-[240px]";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${widthCap} text-[11px] leading-tight font-medium pl-2 ${onRemove ? "pr-0.5" : "pr-2"} py-0.5 rounded-full border ${surface}`}
      title={label}
    >
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 -my-0.5 rounded-full text-primary-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
          aria-label="Supprimer le tag"
          title="Supprimer le tag"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
