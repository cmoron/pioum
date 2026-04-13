import { useState } from "react";
import { Car, User, api } from "../lib/api";
import { isImageUrl } from "../lib/utils";
import { Avatar } from "./Avatar";
import { TagBadge } from "./TagBadge";
import { TagEditor } from "./TagEditor";
import { useAuthStore } from "../stores/auth";
import { useSessionStore } from "../stores/session";
import { BanModal } from "./BanModal";
import clsx from "clsx";

interface CarCardProps {
  car: Car;
  groupId: string;
  isBanned?: boolean;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function CarCard({
  car,
  groupId,
  isBanned,
  onRefresh,
  readOnly = false,
}: CarCardProps) {
  const { user } = useAuthStore();
  const { joinCar, leaveCar, removeCar, kickPassenger } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<User | null>(null);

  const isDriver = user?.id === car.driverId;
  const isPassenger = car.passengers.some((p) => p.userId === user?.id);
  const isFull = car.passengers.length >= car.seats;
  const availableSeats = car.seats - car.passengers.length;

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      await joinCar(car.id);
      onRefresh?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    setError(null);
    try {
      await leaveCar(car.id);
      onRefresh?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCar = async () => {
    if (!confirm("Supprimer ta voiture ?")) return;
    setLoading(true);
    try {
      await removeCar(car.id);
      onRefresh?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async (passengerId: string) => {
    setLoading(true);
    try {
      await kickPassenger(car.id, passengerId);
      onRefresh?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={clsx(
          "card p-4",
          isBanned && "opacity-60 border-red-300 bg-red-50",
        )}
      >
        {/* Driver */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            {car.userCar ? (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-3xl flex-shrink-0 border-2 border-primary-300">
                {isImageUrl(car.userCar.avatar.imageUrl) ? (
                  <img
                    src={car.userCar.avatar.imageUrl}
                    alt={car.userCar.avatar.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{car.userCar.avatar.imageUrl}</span>
                )}
              </div>
            ) : (
              <Avatar user={car.driver} size="md" />
            )}
            <p className="font-medium text-primary-800 truncate">
              {car.userCar
                ? car.userCar.name || car.userCar.avatar.name
                : `Voiture de ${car.driver.name}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className={clsx(
                "text-lg font-bold leading-none",
                isFull ? "text-red-500" : "text-green-600",
              )}
            >
              {availableSeats}/{car.seats}
            </p>
            <p className="text-xs text-primary-600">places</p>
          </div>
        </div>

        {/* Car tags — full-width row below the driver header */}
        {!readOnly && isDriver ? (
          <div className="mb-3">
            <TagEditor
              tags={car.tags ?? []}
              groupId={groupId}
              onAdd={async (data) => {
                await api.addCarTag(car.id, data);
                onRefresh?.();
              }}
              onRemove={async (tagId) => {
                await api.removeCarTag(car.id, tagId);
                onRefresh?.();
              }}
            />
          </div>
        ) : (car.tags ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-3">
            {car.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        ) : null}

        {/* Passengers */}
        <div className="border-t border-primary-200 pt-3 mb-3">
          <div className="flex flex-wrap gap-2">
            {/* Driver */}
            <div className="flex items-center gap-2 bg-primary-100 rounded-full pl-1 pr-3 py-1 border border-primary-300">
              <Avatar user={car.driver} size="sm" />
              <span className="text-sm font-medium text-primary-800">
                {car.driver.name}
              </span>
              <span className="text-xs bg-primary-200 text-primary-700 px-1.5 py-0.5 rounded-full">
                Conducteur
              </span>
            </div>
            {/* Other passengers */}
            {car.passengers.map((passenger) => {
              const isMe = passenger.userId === user?.id;
              const passengerTags = passenger.tags ?? [];
              const showTagsRow =
                (!readOnly && isMe) || passengerTags.length > 0;
              return (
                <div
                  key={passenger.id}
                  className="bg-primary-50 rounded-warm pl-1 pr-3 py-1 border border-primary-200 max-w-full"
                >
                  <div className="flex items-center gap-2">
                    <Avatar user={passenger.user} size="sm" />
                    <span className="text-sm text-primary-800 truncate">
                      {passenger.user.name}
                    </span>
                    {!readOnly && isDriver && !isMe && (
                      <div className="flex gap-1 ml-1 flex-shrink-0">
                        <button
                          onClick={() => handleKick(passenger.userId)}
                          className="text-primary-400 hover:text-red-500 p-1 transition-colors"
                          title="Éjecter"
                        >
                          <XIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setBanTarget(passenger.user)}
                          className="text-primary-400 hover:text-red-500 p-1 transition-colors"
                          title="Bannir"
                        >
                          <BanIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Tags row — sits at the chip's left edge; the chip border groups them with the user above */}
                  {showTagsRow && (
                    <div className="mt-1">
                      {!readOnly && isMe ? (
                        <TagEditor
                          tags={passengerTags}
                          groupId={groupId}
                          onAdd={async (data) => {
                            await api.addPassengerTag(passenger.id, data);
                            onRefresh?.();
                          }}
                          onRemove={async (tagId) => {
                            await api.removePassengerTag(passenger.id, tagId);
                            onRefresh?.();
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {passengerTags.map((tag) => (
                            <TagBadge key={tag.id} tag={tag} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {/* Actions - hidden in read-only mode */}
        {!readOnly && (
          <div className="flex gap-2">
            {isDriver ? (
              <button
                onClick={handleRemoveCar}
                disabled={loading}
                className="btn-danger flex-1"
              >
                Retirer ma voiture
              </button>
            ) : isPassenger ? (
              <button
                onClick={handleLeave}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Quitter
              </button>
            ) : isBanned ? (
              <button disabled className="btn-secondary flex-1 opacity-50">
                Banni de cette voiture
              </button>
            ) : isFull ? (
              <button disabled className="btn-secondary flex-1 opacity-50">
                Complet
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="btn-primary flex-1"
              >
                Rejoindre
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banTarget && (
        <BanModal
          user={banTarget}
          onClose={() => setBanTarget(null)}
          onBanned={onRefresh}
        />
      )}
    </>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function BanIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}
