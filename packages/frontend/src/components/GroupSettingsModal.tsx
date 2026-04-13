import { useState, useEffect } from "react";
import { Group, GroupTag, Avatar as AvatarType, api } from "../lib/api";
import { isImageUrl } from "../lib/utils";

interface GroupSettingsModalProps {
  group: Group;
  onSave: (data: { name?: string; avatarId?: string | null }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function GroupSettingsModal({
  group,
  onSave,
  onDelete,
  onClose,
}: GroupSettingsModalProps) {
  const [name, setName] = useState(group.name);
  const [avatarId, setAvatarId] = useState<string | null>(
    group.avatarId || null,
  );
  const [avatars, setAvatars] = useState<AvatarType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [groupTags, setGroupTags] = useState<GroupTag[]>([]);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagLabel, setEditingTagLabel] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);

  useEffect(() => {
    api.getAvatars().then(({ avatars }) => {
      const groupAvatars = avatars.filter((a) => a.category === "groups");
      setAvatars(groupAvatars);
    });
    api
      .getGroupTags(group.id)
      .then(({ tags }) => setGroupTags(tags))
      .catch(() => {});
  }, [group.id]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Le nom du groupe est requis");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data: { name?: string; avatarId?: string | null } = {};
      if (name !== group.name) data.name = name;
      if (avatarId !== group.avatarId) data.avatarId = avatarId;

      if (Object.keys(data).length > 0) {
        onSave(data);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      onDelete();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-warm-xl border-2 border-primary-300">
        <h2 className="text-xl font-bold mb-4 text-primary-800">
          Paramètres du groupe
        </h2>

        {showDeleteConfirm ? (
          // Confirmation de suppression
          <div>
            <div className="bg-red-50 border-2 border-red-200 rounded-warm p-4 mb-4">
              <p className="text-red-800 font-medium mb-2">
                Supprimer ce groupe ?
              </p>
              <p className="text-red-600 text-sm">
                Cette action est irréversible. Toutes les sessions et données du
                groupe seront supprimées.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-warm font-medium hover:bg-red-600 transition-all shadow-warm hover:shadow-warm-md flex-1"
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        ) : (
          // Formulaire normal
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Nom du groupe
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Nom du groupe"
                maxLength={100}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-primary-800 mb-3">
                Avatar du groupe
              </label>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setAvatarId(avatar.id)}
                    className={`aspect-square flex items-center justify-center text-4xl rounded-warm border-2 transition-all overflow-hidden ${
                      avatarId === avatar.id
                        ? "border-primary-700 bg-primary-100 shadow-warm"
                        : "border-primary-300 hover:border-primary-400"
                    }`}
                  >
                    {isImageUrl(avatar.imageUrl) ? (
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      avatar.imageUrl
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAvatarId(null)}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Supprimer l'avatar
              </button>
            </div>

            {/* Tags du groupe */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Tags prédéfinis
              </label>
              <div className="space-y-2 mb-3">
                {groupTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    {editingTagId === tag.id ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const trimmed = editingTagLabel.trim();
                          if (!trimmed) return;
                          setTagError(null);
                          try {
                            const { tag: updated } = await api.updateGroupTag(
                              group.id,
                              tag.id,
                              trimmed,
                            );
                            setGroupTags((prev) =>
                              prev.map((t) => (t.id === tag.id ? updated : t)),
                            );
                            setEditingTagId(null);
                          } catch (err) {
                            setTagError((err as Error).message);
                          }
                        }}
                        className="flex-1 flex gap-1"
                      >
                        <input
                          type="text"
                          value={editingTagLabel}
                          onChange={(e) => setEditingTagLabel(e.target.value)}
                          maxLength={50}
                          className="flex-1 text-sm px-2 py-1 rounded-warm border border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-600"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="text-xs bg-primary-700 text-white px-2 py-1 rounded-warm hover:bg-primary-800"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTagId(null)}
                          className="text-xs text-primary-600 px-2 py-1"
                        >
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full border border-primary-200">
                          {tag.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditingTagLabel(tag.label);
                          }}
                          className="text-primary-400 hover:text-primary-700 p-1 transition-colors"
                          title="Modifier"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setTagError(null);
                            try {
                              await api.deleteGroupTag(group.id, tag.id);
                              setGroupTags((prev) =>
                                prev.filter((t) => t.id !== tag.id),
                              );
                            } catch (err) {
                              setTagError((err as Error).message);
                            }
                          }}
                          className="text-primary-400 hover:text-red-500 p-1 transition-colors"
                          title="Supprimer"
                        >
                          <svg
                            className="w-4 h-4"
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
                      </>
                    )}
                  </div>
                ))}
              </div>
              {tagError && (
                <p className="text-xs text-red-500 mb-2">{tagError}</p>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = newTagLabel.trim();
                  if (!trimmed) return;
                  setTagError(null);
                  try {
                    const { tag } = await api.createGroupTag(group.id, trimmed);
                    setGroupTags((prev) => [...prev, tag]);
                    setNewTagLabel("");
                  } catch (err) {
                    setTagError((err as Error).message);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  maxLength={50}
                  placeholder="Nouveau tag..."
                  className="flex-1 text-sm px-3 py-1.5 rounded-warm border border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
                <button
                  type="submit"
                  disabled={!newTagLabel.trim()}
                  className="text-sm bg-primary-700 text-white px-3 py-1.5 rounded-warm hover:bg-primary-800 transition-colors disabled:opacity-50"
                >
                  Ajouter
                </button>
              </form>
            </div>

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

            <div className="flex gap-2 mb-4">
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>

            {/* Zone danger */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Supprimer ce groupe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
