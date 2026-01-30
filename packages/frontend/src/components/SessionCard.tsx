import { useState } from 'react'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Avatar } from './Avatar'
import { CarCard } from './CarCard'
import { UserCarSelector } from './UserCarSelector'
import { EditSessionModal } from './EditSessionModal'
import { DeleteSessionModal } from './DeleteSessionModal'

interface SessionCardProps {
  session: Session
  onRefresh: () => void
  bansReceived?: string[]
  compact?: boolean
  alwaysExpanded?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  isAdmin?: boolean
  isPast?: boolean
}

function formatSessionDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return "Aujourd'hui"
  if (isTomorrow(date)) return 'Demain'
  return format(date, 'EEEE d', { locale: fr })
}

function formatSessionTime(startTime: string, endTime: string): string {
  const start = parseISO(startTime)
  const end = parseISO(endTime)
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
}

export function SessionCard({
  session,
  onRefresh,
  bansReceived = [],
  compact = false,
  alwaysExpanded = false,
  expanded: controlledExpanded,
  onToggleExpand,
  isAdmin = false,
  isPast = false
}: SessionCardProps) {
  const { user } = useAuthStore()
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCarSelector, setShowCarSelector] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Support both controlled and uncontrolled modes
  const isControlled = controlledExpanded !== undefined && onToggleExpand !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded
  const setExpanded = isControlled ? () => onToggleExpand() : setInternalExpanded

  const isParticipating = session.passengers.some(p => p.userId === user?.id)
  const myCar = session.cars.find(c => c.driverId === user?.id)
  const isLocked = new Date() >= parseISO(session.startTime)
  const participantsWithoutCar = session.passengers.filter(
    p => !p.carId && !session.cars.some(c => c.driverId === p.userId)
  )

  const isCreator = session.createdById === user?.id
  const hasParticipants = session.passengers.length > 0
  const isRecurring = !!session.recurrencePatternId
  // Admin can always cancel; creator can cancel only if no participants (for single sessions)
  // For recurring sessions, show delete modal which handles permissions
  const canCancel = isAdmin || isCreator
  // Admin or creator can edit (if not locked, or admin can bypass)
  const canEdit = !isLocked && (isAdmin || isCreator)

  const handleJoin = async () => {
    setLoading(true)
    try {
      await api.joinSession(session.id)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    try {
      await api.leaveSession(session.id)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleCarSelected = async (userCarId: string | null, seats: number) => {
    setLoading(true)
    try {
      await api.addCar(session.id, seats, userCarId || undefined)
      onRefresh()
    } finally {
      setLoading(false)
      setShowCarSelector(false)
    }
  }

  const handleCancelClick = () => {
    // For recurring sessions or sessions with participants, show the modal
    if (isRecurring || hasParticipants) {
      setShowDeleteModal(true)
    } else {
      // Simple confirmation for non-recurring sessions without participants
      if (window.confirm('Supprimer cette séance ?')) {
        setLoading(true)
        api.cancelSession(session.id)
          .then(() => onRefresh())
          .finally(() => setLoading(false))
      }
    }
  }

  // Compact mode - collapsible single line
  if (compact) {
    return (
      <div className={`card overflow-hidden ${isPast ? 'bg-primary-50' : ''}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full p-3 flex items-center justify-between transition-colors text-left ${isPast ? 'hover:bg-primary-100' : 'hover:bg-primary-50'}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium capitalize text-sm ${isPast ? 'text-primary-600' : 'text-primary-800'}`}>
                  {formatSessionDate(session.date)}
                </span>
                <span className={`text-xs ${isPast ? 'text-primary-400' : 'text-primary-500'}`}>
                  {formatSessionTime(session.startTime, session.endTime)}
                </span>
                {isPast ? (
                  <span className="text-xs text-primary-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Terminée
                  </span>
                ) : isLocked && (
                  <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div className={`flex items-center gap-2 text-xs ${isPast ? 'text-primary-400' : 'text-primary-500'}`}>
                <span>{session.passengers.length} participant{session.passengers.length > 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{session.cars.length} voiture{session.cars.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isParticipating && (
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-green-400' : 'bg-green-500'}`} title="Tu as participé" />
            )}
            <svg
              className={`w-4 h-4 text-primary-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className={`border-t p-3 space-y-3 ${isPast ? 'border-primary-100' : 'border-primary-200'}`}>
            {/* Action buttons - only for upcoming sessions */}
            {!isPast && (
              <div className="flex gap-2">
                {isParticipating ? (
                  <button onClick={handleLeave} disabled={loading} className="btn-secondary flex-1 text-sm py-1.5">
                    Je ne viens plus
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={loading || isLocked}
                    className="btn-primary flex-1 text-sm py-1.5 disabled:opacity-50"
                  >
                    {isLocked ? 'Fermé' : 'Je viens !'}
                  </button>
                )}
                {isParticipating && !myCar && !isLocked && (
                  <button onClick={() => setShowCarSelector(true)} disabled={loading} className="btn-secondary text-sm py-1.5">
                    + Voiture
                  </button>
                )}
              </div>
            )}

            {participantsWithoutCar.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {participantsWithoutCar.map(p => (
                  <div key={p.id} className={`flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 border ${isPast ? 'bg-primary-100 border-primary-100' : 'bg-primary-50 border-primary-200'}`}>
                    <Avatar user={p.user} size="xs" />
                    <span className={`text-xs ${isPast ? 'text-primary-600' : 'text-primary-700'}`}>{p.user.name}</span>
                  </div>
                ))}
              </div>
            )}

            {session.cars.length > 0 && (
              <div className="space-y-1.5">
                {session.cars.map(car => (
                  <CarCard key={car.id} car={car} isBanned={bansReceived.includes(car.driverId)} onRefresh={onRefresh} readOnly={isPast} />
                ))}
              </div>
            )}

            {/* Edit and Cancel buttons - only for upcoming sessions */}
            {!isPast && (canEdit || canCancel) && (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    disabled={loading}
                    className="flex-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-warm py-1.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancelClick}
                    disabled={loading}
                    className="flex-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-warm py-1.5 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {showCarSelector && (
          <UserCarSelector onSelect={handleCarSelected} onClose={() => setShowCarSelector(false)} />
        )}

        {showEditModal && (
          <EditSessionModal
            session={session}
            onClose={() => setShowEditModal(false)}
            onUpdated={onRefresh}
          />
        )}

        {showDeleteModal && (
          <DeleteSessionModal
            session={session}
            onClose={() => setShowDeleteModal(false)}
            onDeleted={onRefresh}
          />
        )}
      </div>
    )
  }

  // Full mode - always expanded (no toggle button)
  if (alwaysExpanded) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-800 capitalize">
                  {formatSessionDate(session.date)}
                </span>
                {isLocked && (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-primary-600">
                {formatSessionTime(session.startTime, session.endTime)}
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-primary-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {session.passengers.length}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M18 17H21C21.5523 17 22 16.5523 22 16V12.6311C22 12.2188 21.747 11.8488 21.3629 11.6992L17 10L14 5H6L4 10H3C2.44772 10 2 10.4477 2 11V16C2 16.5523 2.44772 17 3 17H6M18 17C18 18.1046 17.1046 19 16 19C14.8954 19 14 18.1046 14 17M18 17C18 15.8954 17.1046 15 16 15C14.8954 15 14 15.8954 14 17M6 17C6 18.1046 6.89543 19 8 19C9.10457 19 10 18.1046 10 17M6 17C6 15.8954 6.89543 15 8 15C9.10457 15 10 15.8954 10 17M10 17H14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {session.cars.length}
              </span>
              {isParticipating && (
                <span className="w-2 h-2 rounded-full bg-green-500" title="Tu participes" />
              )}
            </div>
          </div>

          {/* Join/Leave button */}
          <div className="mb-4">
            {isParticipating ? (
              <button onClick={handleLeave} disabled={loading} className="btn-secondary w-full">
                Je ne viens plus
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={loading || isLocked}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isLocked ? 'Inscriptions fermées' : 'Je viens !'}
              </button>
            )}
          </div>

          {participantsWithoutCar.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-primary-700 mb-2">En attente de voiture</p>
              <div className="flex flex-wrap gap-2">
                {participantsWithoutCar.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-primary-50 rounded-full pl-1 pr-3 py-1 border border-primary-200">
                    <Avatar user={p.user} size="sm" />
                    <span className="text-sm text-primary-800">{p.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add car button - full width like the old UI */}
          {isParticipating && !myCar && !isLocked && (
            <button
              onClick={() => setShowCarSelector(true)}
              disabled={loading}
              className="w-full btn-secondary mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              J'ai ma voiture
            </button>
          )}

          {session.cars.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-700">Voitures</p>
              {session.cars.map(car => (
                <CarCard key={car.id} car={car} isBanned={bansReceived.includes(car.driverId)} onRefresh={onRefresh} />
              ))}
            </div>
          )}

          {/* Edit and Cancel buttons */}
          {(canEdit || canCancel) && (
            <div className="flex gap-2 mt-4">
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  disabled={loading}
                  className="flex-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-warm py-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
              )}
              {canCancel && (
                <button
                  onClick={handleCancelClick}
                  disabled={loading}
                  className="flex-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-warm py-2 transition-colors disabled:opacity-50"
                >
                  Annuler la séance
                </button>
              )}
            </div>
          )}
        </div>

        {showCarSelector && (
          <UserCarSelector onSelect={handleCarSelected} onClose={() => setShowCarSelector(false)} />
        )}

        {showEditModal && (
          <EditSessionModal
            session={session}
            onClose={() => setShowEditModal(false)}
            onUpdated={onRefresh}
          />
        )}

        {showDeleteModal && (
          <DeleteSessionModal
            session={session}
            onClose={() => setShowDeleteModal(false)}
            onDeleted={onRefresh}
          />
        )}
      </div>
    )
  }

  // Full mode - expandable card (legacy, kept for backwards compatibility)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-primary-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary-800 capitalize">
              {formatSessionDate(session.date)}
            </span>
            {isLocked && (
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-primary-600">
            {formatSessionTime(session.startTime, session.endTime)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm text-primary-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {session.passengers.length}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-4 9l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2h-5l-4 4z" />
              </svg>
              {session.cars.length}
            </span>
          </div>

          {isParticipating && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Tu participes" />
          )}

          <svg
            className={`w-5 h-5 text-primary-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-primary-200 p-4 space-y-4">
          <div className="flex gap-2">
            {isParticipating ? (
              <button onClick={handleLeave} disabled={loading} className="btn-secondary flex-1">
                Je ne viens plus
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={loading || isLocked}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isLocked ? 'Inscriptions fermées' : 'Je viens !'}
              </button>
            )}

            {isParticipating && !myCar && !isLocked && (
              <button onClick={() => setShowCarSelector(true)} disabled={loading} className="btn-secondary">
                + Voiture
              </button>
            )}
          </div>

          {participantsWithoutCar.length > 0 && (
            <div>
              <p className="text-sm font-medium text-primary-700 mb-2">En attente de voiture</p>
              <div className="flex flex-wrap gap-2">
                {participantsWithoutCar.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-primary-50 rounded-full pl-1 pr-3 py-1 border border-primary-200">
                    <Avatar user={p.user} size="sm" />
                    <span className="text-sm text-primary-800">{p.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.cars.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-700">Voitures</p>
              {session.cars.map(car => (
                <CarCard key={car.id} car={car} isBanned={bansReceived.includes(car.driverId)} onRefresh={onRefresh} />
              ))}
            </div>
          )}

          {/* Edit and Cancel buttons */}
          {(canEdit || canCancel) && (
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  disabled={loading}
                  className="flex-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-warm py-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
              )}
              {canCancel && (
                <button
                  onClick={handleCancelClick}
                  disabled={loading}
                  className="flex-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-warm py-2 transition-colors disabled:opacity-50"
                >
                  Annuler la séance
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showCarSelector && (
        <UserCarSelector onSelect={handleCarSelected} onClose={() => setShowCarSelector(false)} />
      )}

      {showEditModal && (
        <EditSessionModal
          session={session}
          onClose={() => setShowEditModal(false)}
          onUpdated={onRefresh}
        />
      )}

      {showDeleteModal && (
        <DeleteSessionModal
          session={session}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={onRefresh}
        />
      )}
    </div>
  )
}
