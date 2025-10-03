/**
 * Magyar Totó API wrapper for fetching weekly voucher data
 * Supports fetching the weekly 13+1 football matches from various sources
 */

import type { TotoRound } from './types'

interface TotoMatch {
  order: number           // 1-14 (position on the voucher)
  home: string            // Home team name
  away: string            // Away team name
  league: string          // League/competition name
  kickoff: string         // Match start time (ISO 8601)
}

/**
 * Fetch the current week's Magyar Totó voucher
 * 
 * Data sources (in order of preference):
 * 1. Szerencsejáték Zrt. official website (https://www.szerencsejatek.hu/toto)
 * 2. Manual seed data (fallback)
 * 
 * @returns Promise<TotoRound> The current week's matches
 */
export async function fetchWeeklyToto(): Promise<TotoRound> {
  try {
    console.log('[Totó] Fetching weekly Magyar Totó voucher...')
    
    // TODO: Implement actual scraping/API call to Szerencsejáték Zrt.
    // For now, we'll return mock data for development
    
    const mockRound = getMockTotoRound()
    console.log(`[Totó] Using mock data for week: ${mockRound.week_label}`)
    
    return mockRound
  } catch (error) {
    console.error('[Totó] Error fetching weekly totó:', error)
    // Fallback to mock data
    return getMockTotoRound()
  }
}

/**
 * Get the current week number and date range
 */
function getCurrentWeek(): { weekNumber: number; start: Date; end: Date } {
  const now = new Date()
  
  // Get Monday of current week
  const monday = new Date(now)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  
  // Get Sunday of current week
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  // Calculate week number (ISO 8601 week date)
  const weekNumber = getWeekNumber(now)
  
  return { weekNumber, start: monday, end: sunday }
}

/**
 * Get ISO 8601 week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Generate mock Totó data for development
 * This simulates a weekly 13+1 match voucher
 */
function getMockTotoRound() {
  const { weekNumber, start, end } = getCurrentWeek()
  const year = start.getFullYear()
  
  // Create 14 realistic football matches
  const mockMatches: TotoMatch[] = [
    {
      order: 1,
      home: 'Manchester United',
      away: 'Liverpool',
      league: 'Premier League',
      kickoff: new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString() // Wednesday 15:00
    },
    {
      order: 2,
      home: 'Real Madrid',
      away: 'Barcelona',
      league: 'La Liga',
      kickoff: new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000).toISOString() // Wednesday 20:00
    },
    {
      order: 3,
      home: 'Bayern München',
      away: 'Borussia Dortmund',
      league: 'Bundesliga',
      kickoff: new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString() // Thursday 18:00
    },
    {
      order: 4,
      home: 'Paris Saint-Germain',
      away: 'Olympique Marseille',
      league: 'Ligue 1',
      kickoff: new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000).toISOString() // Thursday 20:00
    },
    {
      order: 5,
      home: 'Juventus',
      away: 'Inter Milan',
      league: 'Serie A',
      kickoff: new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString() // Friday 19:00
    },
    {
      order: 6,
      home: 'Arsenal',
      away: 'Chelsea',
      league: 'Premier League',
      kickoff: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString() // Saturday 12:00
    },
    {
      order: 7,
      home: 'Atlético Madrid',
      away: 'Sevilla',
      league: 'La Liga',
      kickoff: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString() // Saturday 16:00
    },
    {
      order: 8,
      home: 'Manchester City',
      away: 'Tottenham',
      league: 'Premier League',
      kickoff: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString() // Saturday 17:00
    },
    {
      order: 9,
      home: 'AC Milan',
      away: 'Napoli',
      league: 'Serie A',
      kickoff: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString() // Saturday 18:00
    },
    {
      order: 10,
      home: 'RB Leipzig',
      away: 'Bayer Leverkusen',
      league: 'Bundesliga',
      kickoff: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString() // Saturday 15:00
    },
    {
      order: 11,
      home: 'AS Roma',
      away: 'Lazio',
      league: 'Serie A',
      kickoff: new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString() // Sunday 14:00
    },
    {
      order: 12,
      home: 'Newcastle United',
      away: 'Aston Villa',
      league: 'Premier League',
      kickoff: new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString() // Sunday 16:00
    },
    {
      order: 13,
      home: 'Valencia',
      away: 'Athletic Bilbao',
      league: 'La Liga',
      kickoff: new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString() // Sunday 18:00
    },
    {
      order: 14,
      home: 'Benfica',
      away: 'Porto',
      league: 'Primeira Liga',
      kickoff: new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000).toISOString() // Sunday 20:00 (Extra match)
    }
  ]
  
  return {
    id: `${year}-week-${weekNumber}`,
    weekNumber,
    weekLabel: `${weekNumber}. hét`,
    weekStart: formatDate(start),
    weekEnd: formatDate(end),
    year,
    status: 'active' as const,
    matches: mockMatches.map(m => ({
      id: `match-${year}-w${weekNumber}-${m.order}`,
      roundId: `${year}-week-${weekNumber}`,
      matchOrder: m.order,
      league: m.league,
      home: m.home,
      away: m.away,
      kickoff: m.kickoff,
      status: 'upcoming' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as TotoRound
}

/**
 * Save Totó round and matches to database
 */
export async function saveTotoRoundToDatabase(round: TotoRound): Promise<void> {
  const { getSupabaseClient } = await import('./supabase')
  const supabase = getSupabaseClient()
  
  try {
    console.log(`[Totó] Saving round ${round.id} to database...`)
    
    // TODO: Implement database save when schema is ready
    // For now, just log the action
    console.log(`[Totó] Would save round with ${round.matches.length} matches`)
    
  } catch (error) {
    console.error('[Totó] Error saving to database:', error)
    throw error
  }
}
