// Core types for TipMix AI application

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
  eventId: string
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
  eventId: string
  sourceId?: string
  type: 'injury' | 'suspension' | 'form' | 'coach_change' | 'other'
  entity: string
  description: string
  confidence: number
  extractedAt: string
}

export interface Prediction {
  id: string
  eventId: string
  outcome: '1' | 'X' | '2'
  probabilities: {
    home: number
    draw: number
    away: number
  }
  rationale: string
  topSources: string[]
  confidence: number
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
