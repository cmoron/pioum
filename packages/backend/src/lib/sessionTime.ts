import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

// Les horaires de séance sont exprimés en heure de Paris, comme les patterns de
// récurrence (cf. services/recurrence.ts). Les helpers passent par des wall-times
// en chaîne pour rester indépendants de la timezone du serveur (UTC en Docker).
export const SESSION_TIMEZONE = 'Europe/Paris'

/** Partie date (yyyy-MM-dd) d'un champ `@db.Date`, stocké à minuit UTC. */
function utcDatePart(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
}

/** Instant UTC correspondant à HH:mm heure de Paris le jour donné. */
export function zonedTimeOnDate(date: Date, hhmm: string): Date {
  return fromZonedTime(`${utcDatePart(date)}T${hhmm}:00`, SESSION_TIMEZONE)
}

/** Heure de Paris (HH:mm) d'un instant UTC. */
export function zonedHHmm(instant: Date): string {
  return formatInTimeZone(instant, SESSION_TIMEZONE, 'HH:mm')
}

/** Créneau par défaut d'une séance : 12:00–14:00 heure de Paris. */
export function getDefaultTimes(date: Date): { startTime: Date; endTime: Date } {
  return {
    startTime: zonedTimeOnDate(date, '12:00'),
    endTime: zonedTimeOnDate(date, '14:00'),
  }
}

/** Date du jour à Paris, à minuit UTC (convention de stockage de Session.date). */
export function getTodayDate(): Date {
  return new Date(`${formatInTimeZone(new Date(), SESSION_TIMEZONE, 'yyyy-MM-dd')}T00:00:00.000Z`)
}
