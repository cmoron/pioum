import { PassengerTag, CarTag } from "../lib/api";

interface TagBadgeProps {
  tag: PassengerTag | CarTag;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const label = tag.groupTag?.label ?? tag.freeText ?? "";

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full border border-primary-200">
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
  );
}
