import type { TippmixEvent } from './types'

/**
 * Tippmix API wrapper for fetching events and odds
 * Based on: https://prog.hu/tudastar/212954/futball-odds-ok-lehuzasa-dinamikus-weboldalrol
 */

export async function fetchTippmixEvents(): Promise<TippmixEvent[]> {
  const config = useRuntimeConfig()
  const apiUrl = config.tippmixApiUrl
  
  if (!apiUrl) {
    console.warn('Tippmix API URL not configured, returning mock data')
    return getMockEvents()
  }

  try {
    // In a real implementation, this would fetch from the actual Tippmix API
    // For now, we'll return mock data since the API requires dynamic scraping
    console.log('Fetching events from Tippmix API:', apiUrl)
    
    // TODO: Implement actual API fetching with Playwright/Cheerio
    // const response = await fetch(apiUrl)
    // const data = await response.json()
    // return parseEventsFromResponse(data)
    
    return getMockEvents()
  } catch (error) {
    console.error('Error fetching Tippmix events:', error)
    throw new Error('Failed to fetch Tippmix events')
  }
}

export function parseOdds(oddsString: string): { home: number; draw: number; away: number } {
  // Parse odds from various formats
  // Example: "2.50 3.20 2.80" or other formats
  const parts = oddsString.trim().split(/\s+/)
  
  if (parts.length >= 3) {
    return {
      home: parseFloat(parts[0]) || 1.0,
      draw: parseFloat(parts[1]) || 1.0,
      away: parseFloat(parts[2]) || 1.0
    }
  }
  
  return { home: 1.0, draw: 1.0, away: 1.0 }
}

// Mock data for development and testing
function getMockEvents(): TippmixEvent[] {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  return [
    {
      id: 'evt_001',
      league: 'Premier League',
      home: 'Manchester United',
      away: 'Liverpool',
      startTime: tomorrow.toISOString(),
      odds: {
        home: 2.50,
        draw: 3.20,
        away: 2.80
      },
      status: 'upcoming',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'evt_002',
      league: 'La Liga',
      home: 'Real Madrid',
      away: 'Barcelona',
      startTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      odds: {
        home: 2.20,
        draw: 3.40,
        away: 3.10
      },
      status: 'upcoming',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'evt_003',
      league: 'Bundesliga',
      home: 'Bayern Munich',
      away: 'Borussia Dortmund',
      startTime: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      odds: {
        home: 1.80,
        draw: 3.60,
        away: 4.20
      },
      status: 'upcoming',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'evt_004',
      league: 'Serie A',
      home: 'Juventus',
      away: 'AC Milan',
      startTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000).toISOString(),
      odds: {
        home: 2.10,
        draw: 3.30,
        away: 3.40
      },
      status: 'upcoming',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'evt_005',
      league: 'Ligue 1',
      home: 'Paris Saint-Germain',
      away: 'Olympique Marseille',
      startTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      odds: {
        home: 1.60,
        draw: 3.80,
        away: 5.50
      },
      status: 'upcoming',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ]
}

export async function saveEventsToDatabase(events: TippmixEvent[]): Promise<void> {
  const supabase = getSupabaseClient()
  
  try {
    // Transform events to match database schema (snake_case columns)
    const dbEvents = events.map(event => ({
      id: event.id,
      league: event.league,
      home: event.home,
      away: event.away,
      start_time: event.startTime,
      odds_home: event.odds.home,
      odds_draw: event.odds.draw,
      odds_away: event.odds.away,
      status: event.status || 'upcoming',
      created_at: event.createdAt,
      updated_at: event.updatedAt
    }))

    const { error } = await supabase
      .from('events')
      .upsert(dbEvents, {
        onConflict: 'id'
      })
    
    if (error) {
      throw error
    }
    
    console.log(`Successfully saved ${events.length} events to database`)
  } catch (error) {
    console.error('Error saving events to database:', error)
    throw new Error('Failed to save events to database')
  }
}
