import type { TippmixEvent } from './types'

/**
 * Tippmix API wrapper for fetching events and odds
 * Uses the official Tippmix API: https://api.tippmix.hu/tippmix/search
 */

export async function fetchTippmixEvents(): Promise<TippmixEvent[]> {
  try {
    console.log('Fetching events from Tippmix API...')
    
    // Use the actual Tippmix API
    const apiUrl = 'https://api.tippmix.hu/tippmix/search'
    
    // Get today's date for the search
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const requestBody = {
      fieldValue: "",
      sportId: 1, // Football
      countryId: 0, // All countries
      competitionId: 0, // All competitions
      type: 0,
      date: today.toISOString(),
      minOdds: null,
      maxOdds: null
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      console.warn(`Tippmix API returned status ${response.status}, falling back to mock data`)
      return getMockEvents()
    }
    
    const data = await response.json()
    
    // Parse the response and convert to TippmixEvent format
    const parsedEvents = parseTippmixResponse(data)
    
    if (parsedEvents.length === 0) {
      console.warn('No events returned from Tippmix API, falling back to mock data')
      return getMockEvents()
    }
    
    console.log(`Successfully fetched ${parsedEvents.length} events from Tippmix API`)
    return parsedEvents
  } catch (error) {
    console.error('Error fetching from Tippmix API:', error)
    console.warn('Falling back to mock data')
    return getMockEvents()
  }
}

/**
 * Parse Tippmix API response to TippmixEvent format
 */
function parseTippmixResponse(data: any): TippmixEvent[] {
  const events: TippmixEvent[] = []
  
  try {
    // The Tippmix API response structure may vary
    // Adjust this based on the actual response format
    const matches = data.matches || data.events || data.items || data || []
    
    if (!Array.isArray(matches)) {
      console.warn('Unexpected API response format')
      return []
    }
    
    const now = new Date()
    
    matches.forEach((match: any, index: number) => {
      try {
        // Extract match details from the API response
        // Common field names in betting APIs
        const home = match.homeTeam || match.home || match.team1 || match.participant1
        const away = match.awayTeam || match.away || match.team2 || match.participant2
        const league = match.competition || match.league || match.tournament || 'Football'
        
        // Extract odds - look for 1X2 markets
        let homeOdds = 2.0
        let drawOdds = 3.0
        let awayOdds = 2.5
        
        if (match.odds) {
          // Try to find 1X2 odds
          if (Array.isArray(match.odds)) {
            const oddsArray = match.odds
            if (oddsArray.length >= 3) {
              homeOdds = parseFloat(oddsArray[0]?.value || oddsArray[0]) || 2.0
              drawOdds = parseFloat(oddsArray[1]?.value || oddsArray[1]) || 3.0
              awayOdds = parseFloat(oddsArray[2]?.value || oddsArray[2]) || 2.5
            }
          } else if (typeof match.odds === 'object') {
            homeOdds = parseFloat(match.odds.home || match.odds['1'] || match.odds.homeWin) || 2.0
            drawOdds = parseFloat(match.odds.draw || match.odds['X'] || match.odds.tie) || 3.0
            awayOdds = parseFloat(match.odds.away || match.odds['2'] || match.odds.awayWin) || 2.5
          }
        }
        
        // Extract start time
        let startTime = match.startTime || match.date || match.kickoff || match.time
        if (startTime) {
          // Ensure it's a valid date
          const parsed = new Date(startTime)
          if (!isNaN(parsed.getTime())) {
            startTime = parsed.toISOString()
          } else {
            startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          }
        } else {
          startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
        
        // Create event ID from match data or use index
        const eventId = match.id || match.eventId || match.matchId || `tippmix_${Date.now()}_${index}`
        
        if (home && away) {
          events.push({
            id: String(eventId),
            league: String(league),
            home: String(home),
            away: String(away),
            startTime,
            odds: {
              home: homeOdds,
              draw: drawOdds,
              away: awayOdds
            },
            status: 'upcoming' as const,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          })
        }
      } catch (err) {
        console.error('Error parsing individual match:', err)
      }
    })
    
    return events
  } catch (error) {
    console.error('Error parsing Tippmix response:', error)
    return []
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
