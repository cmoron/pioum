import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  zonedTimeOnDate,
  zonedHHmm,
  getDefaultTimes,
  getTodayDate,
} from './sessionTime.js'

// Les attendus sont des instants UTC : les helpers doivent donner le même
// résultat quelle que soit la timezone du serveur (UTC en Docker, Paris en dev).

describe('zonedTimeOnDate', () => {
  it('convertit HH:mm heure de Paris en instant UTC (heure d\'hiver, UTC+1)', () => {
    const date = new Date('2026-01-15T00:00:00.000Z')
    expect(zonedTimeOnDate(date, '12:00').toISOString()).toBe('2026-01-15T11:00:00.000Z')
  })

  it('convertit HH:mm heure de Paris en instant UTC (heure d\'été, UTC+2)', () => {
    const date = new Date('2026-06-15T00:00:00.000Z')
    expect(zonedTimeOnDate(date, '12:00').toISOString()).toBe('2026-06-15T10:00:00.000Z')
  })
})

describe('zonedHHmm', () => {
  it('extrait l\'heure de Paris d\'un instant UTC, hiver comme été', () => {
    expect(zonedHHmm(new Date('2026-01-15T11:00:00.000Z'))).toBe('12:00')
    expect(zonedHHmm(new Date('2026-06-15T10:00:00.000Z'))).toBe('12:00')
  })

  it('fait un aller-retour stable avec zonedTimeOnDate', () => {
    const date = new Date('2026-06-15T00:00:00.000Z')
    const instant = zonedTimeOnDate(date, '11:30')
    expect(zonedHHmm(instant)).toBe('11:30')
  })
})

describe('getDefaultTimes', () => {
  it('retourne 12:00–14:00 heure de Paris pour la date donnée', () => {
    const { startTime, endTime } = getDefaultTimes(new Date('2026-06-15T00:00:00.000Z'))
    expect(startTime.toISOString()).toBe('2026-06-15T10:00:00.000Z')
    expect(endTime.toISOString()).toBe('2026-06-15T12:00:00.000Z')
  })
})

describe('getTodayDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retourne la date du jour à Paris (minuit UTC), pas celle du serveur', () => {
    // 22:30 UTC le 10 juin = 00:30 le 11 juin à Paris → "aujourd'hui" = 11 juin
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T22:30:00.000Z'))
    expect(getTodayDate().toISOString()).toBe('2026-06-11T00:00:00.000Z')
  })

  it('reste sur la même date en pleine journée', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'))
    expect(getTodayDate().toISOString()).toBe('2026-06-10T00:00:00.000Z')
  })
})
