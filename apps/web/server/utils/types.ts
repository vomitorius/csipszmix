// Core types for Magyar Totó AI application

// Magyar Totó types
export interface TotoRound {
  id: string              // "2025-week-40"
  weekNumber: number      // ISO week number
  weekLabel: string       // "40. hét"
  weekStart: string       // "2025-10-06" (Monday)
  weekEnd: string         // "2025-10-12" (Sunday)
  year: number
  status: 'upcoming' | 'active' | 'finished'
  matches?: Match[]       // Populated with matches
  createdAt: string
  updatedAt: string
}

export interface Match {
  id: string
  roundId: string
  matchOrder: number      // Position on voucher (1-14)
  league: string
  home: string
  away: string
  kickoff: string         // ISO 8601 timestamp
  oddsHome?: number       // Optional (not always needed for Totó)
  oddsDraw?: number
  oddsAway?: number
  status: 'upcoming' | 'live' | 'finished'
  createdAt: string
  updatedAt: string
}

// Legacy Tippmix types (kept for compatibility during migration)
export interface TippmixEvent {
  id: string
  league: string
  home: string
  away: string
  startTime: string
  odds: {
    home: number
    draw: number
    away: number
  }
  status?: 'upcoming' | 'live' | 'finished'
  createdAt?: string
  updatedAt?: string
}

export interface Source {
  id: string
  eventId?: string        // Legacy field
  matchId?: string        // New field for Totó matches
  url: string
  title: string
  date: string
  content: string
  rawHtml?: string
  createdAt: string
}

export interface Chunk {
  id: string
  sourceId: string
  content: string
  embedding?: number[]
  metadata?: Record<string, any>
  createdAt: string
}

export interface Fact {
  id: string
  eventId?: string        // Legacy field
  matchId?: string        // New field for Totó matches
  sourceId?: string
  type: 'injury' | 'suspension' | 'form' | 'coach_change' | 'other'
  entity: string
  description: string
  confidence: number
  extractedAt: string
}

export interface Prediction {
  id: string
  eventId?: string        // Legacy field
  matchId?: string        // New field for Totó matches
  outcome: '1' | 'X' | '2'
  probabilities: {
    home: number
    draw: number
    away: number
  }
  rationale: string
  topSources: string[]
  confidence: number
  keyFactors?: string[]   // Added for detailed explanations
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: string
  name: string
  budget: number
  events: {
    eventId: string
    outcome: '1' | 'X' | '2'
    odds: number
  }[]
  totalOdds: number
  expectedReturn: number
  variants?: TicketVariant[]
  createdAt: string
  updatedAt: string
}

export interface TicketVariant {
  id: string
  ticketId: string
  events: {
    eventId: string
    outcome: '1' | 'X' | '2'
    odds: number
  }[]
  totalOdds: number
  stake: number
  expectedReturn: number
}
