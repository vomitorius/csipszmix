/**
 * Ticket variant generation utilities
 * Creates betting ticket combinations with different coverage strategies
 */

export interface EventSelection {
  eventId: string
  home: string
  away: string
  prediction: {
    outcome: '1' | 'X' | '2'
    probabilities: {
      home: number
      draw: number
      away: number
    }
    confidence: number
  }
  odds: {
    home: number
    draw: number
    away: number
  }
}

export interface TicketVariant {
  id: string
  picks: Array<{
    eventId: string
    home: string
    away: string
    outcome: '1' | 'X' | '2'
    odds: number
    confidence: number
  }>
  totalOdds: number
  stake: number
  expectedReturn: number
  expectedValue: number // Expected value based on probabilities
}

export interface VariantsResult {
  tickets: TicketVariant[]
  totalCost: number
  coverage: {
    totalCombinations: number
    coveredCombinations: number
    coveragePercent: number
  }
  strategy: string
}

/**
 * Calculate entropy-based uncertainty score
 * Higher entropy = more uncertainty
 */
export function calculateUncertainty(probs: { home: number; draw: number; away: number }): number {
  const p1 = Math.max(probs.home, 0.001) // Avoid log(0)
  const px = Math.max(probs.draw, 0.001)
  const p2 = Math.max(probs.away, 0.001)
  
  // Shannon entropy
  const entropy = -(
    (p1 * Math.log2(p1)) +
    (px * Math.log2(px)) +
    (p2 * Math.log2(p2))
  )
  
  // Normalize to 0-1 (max entropy for 3 outcomes is log2(3) ≈ 1.585)
  return entropy / 1.585
}

/**
 * Calculate margin-based uncertainty
 * Smaller margin between top 2 outcomes = more uncertainty
 */
export function calculateMarginUncertainty(probs: { home: number; draw: number; away: number }): number {
  const sorted = [probs.home, probs.draw, probs.away].sort((a, b) => b - a)
  const margin = sorted[0] - sorted[1]
  return 1 - margin // Higher uncertainty when margin is smaller
}

/**
 * Combined uncertainty score
 */
export function calculateCombinedUncertainty(probs: { home: number; draw: number; away: number }): number {
  const entropy = calculateUncertainty(probs)
  const margin = calculateMarginUncertainty(probs)
  
  // Weight both metrics equally
  return (entropy + margin) / 2
}

/**
 * Get outcome and odds for a specific pick
 */
function getOutcomeOdds(event: EventSelection, outcome: '1' | 'X' | '2'): number {
  switch (outcome) {
    case '1': return event.odds.home
    case 'X': return event.odds.draw
    case '2': return event.odds.away
  }
}

/**
 * Calculate expected value for a ticket
 */
function calculateExpectedValue(variant: TicketVariant, events: EventSelection[]): number {
  // Probability that ALL picks are correct
  let combinedProbability = 1.0
  
  for (const pick of variant.picks) {
    const event = events.find(e => e.eventId === pick.eventId)
    if (!event) continue
    
    let pickProbability = 0
    switch (pick.outcome) {
      case '1': pickProbability = event.prediction.probabilities.home; break
      case 'X': pickProbability = event.prediction.probabilities.draw; break
      case '2': pickProbability = event.prediction.probabilities.away; break
    }
    
    combinedProbability *= pickProbability
  }
  
  // Expected value = (probability * payout) - stake
  const payout = variant.stake * variant.totalOdds
  return (combinedProbability * payout) - variant.stake
}

/**
 * Strategy 1: Single ticket with top predictions
 */
export function generateSingleTicket(
  events: EventSelection[],
  budget: number
): TicketVariant[] {
  const picks = events.map(event => ({
    eventId: event.eventId,
    home: event.home,
    away: event.away,
    outcome: event.prediction.outcome,
    odds: getOutcomeOdds(event, event.prediction.outcome),
    confidence: event.prediction.confidence
  }))
  
  // Calculate total odds
  const totalOdds = picks.reduce((acc, pick) => acc * pick.odds, 1)
  
  const ticket: TicketVariant = {
    id: 'single-1',
    picks,
    totalOdds,
    stake: budget,
    expectedReturn: budget * totalOdds,
    expectedValue: 0 // Will be calculated
  }
  
  ticket.expectedValue = calculateExpectedValue(ticket, events)
  
  return [ticket]
}

/**
 * Strategy 2: Cover top 2 outcomes on most certain matches
 */
export function generateCover2Tickets(
  events: EventSelection[],
  budget: number,
  maxVariants: number = 10
): TicketVariant[] {
  // Sort events by confidence (most certain first)
  const sortedEvents = [...events].sort((a, b) => 
    b.prediction.confidence - a.prediction.confidence
  )
  
  // Find the best event to cover (most certain)
  const eventToCover = sortedEvents[0]
  const otherEvents = sortedEvents.slice(1)
  
  // Get top 2 outcomes for the event to cover
  const probs = [
    { outcome: '1' as const, prob: eventToCover.prediction.probabilities.home },
    { outcome: 'X' as const, prob: eventToCover.prediction.probabilities.draw },
    { outcome: '2' as const, prob: eventToCover.prediction.probabilities.away }
  ].sort((a, b) => b.prob - a.prob)
  
  const top2Outcomes = probs.slice(0, 2)
  
  // Create 2 variants
  const variants: TicketVariant[] = []
  const stakePerTicket = budget / 2
  
  for (let i = 0; i < 2; i++) {
    const outcome = top2Outcomes[i].outcome
    
    const picks = [
      {
        eventId: eventToCover.eventId,
        home: eventToCover.home,
        away: eventToCover.away,
        outcome,
        odds: getOutcomeOdds(eventToCover, outcome),
        confidence: eventToCover.prediction.confidence
      },
      ...otherEvents.map(event => ({
        eventId: event.eventId,
        home: event.home,
        away: event.away,
        outcome: event.prediction.outcome,
        odds: getOutcomeOdds(event, event.prediction.outcome),
        confidence: event.prediction.confidence
      }))
    ]
    
    const totalOdds = picks.reduce((acc, pick) => acc * pick.odds, 1)
    
    const ticket: TicketVariant = {
      id: `cover2-${i + 1}`,
      picks,
      totalOdds,
      stake: stakePerTicket,
      expectedReturn: stakePerTicket * totalOdds,
      expectedValue: 0
    }
    
    ticket.expectedValue = calculateExpectedValue(ticket, events)
    variants.push(ticket)
  }
  
  return variants
}

/**
 * Strategy 3: Cover uncertain matches with multiple outcomes
 */
export function generateCoverUncertainTickets(
  events: EventSelection[],
  budget: number,
  maxVariants: number = 10
): TicketVariant[] {
  // Calculate uncertainty for each event
  const eventsWithUncertainty = events.map(event => ({
    ...event,
    uncertainty: calculateCombinedUncertainty(event.prediction.probabilities)
  }))
  
  // Sort by uncertainty (most uncertain first)
  const sortedEvents = eventsWithUncertainty.sort((a, b) => 
    b.uncertainty - a.uncertainty
  )
  
  // Take top 2 most uncertain events
  const uncertainEvents = sortedEvents.slice(0, Math.min(2, events.length))
  const certainEvents = sortedEvents.slice(Math.min(2, events.length))
  
  if (uncertainEvents.length === 0) {
    // No uncertain events, fall back to single
    return generateSingleTicket(events, budget)
  }
  
  // Generate combinations
  const variants: TicketVariant[] = []
  
  // For each uncertain event, get top 2 outcomes
  const uncertainOutcomes: Array<Array<'1' | 'X' | '2'>> = []
  
  for (const event of uncertainEvents) {
    const probs = [
      { outcome: '1' as const, prob: event.prediction.probabilities.home },
      { outcome: 'X' as const, prob: event.prediction.probabilities.draw },
      { outcome: '2' as const, prob: event.prediction.probabilities.away }
    ].sort((a, b) => b.prob - a.prob)
    
    uncertainOutcomes.push(probs.slice(0, 2).map(p => p.outcome))
  }
  
  // Generate all combinations
  function* combinations<T>(arrays: T[][]): Generator<T[]> {
    if (arrays.length === 0) {
      yield []
      return
    }
    
    const [first, ...rest] = arrays
    for (const item of first) {
      for (const combo of combinations(rest)) {
        yield [item, ...combo]
      }
    }
  }
  
  let variantIndex = 0
  const stakePerTicket = budget / Math.min(maxVariants, Math.pow(2, uncertainEvents.length))
  
  for (const combo of combinations(uncertainOutcomes)) {
    if (variantIndex >= maxVariants) break
    
    const picks = [
      ...uncertainEvents.map((event, idx) => ({
        eventId: event.eventId,
        home: event.home,
        away: event.away,
        outcome: combo[idx],
        odds: getOutcomeOdds(event, combo[idx]),
        confidence: event.prediction.confidence
      })),
      ...certainEvents.map(event => ({
        eventId: event.eventId,
        home: event.home,
        away: event.away,
        outcome: event.prediction.outcome,
        odds: getOutcomeOdds(event, event.prediction.outcome),
        confidence: event.prediction.confidence
      }))
    ]
    
    const totalOdds = picks.reduce((acc, pick) => acc * pick.odds, 1)
    
    const ticket: TicketVariant = {
      id: `uncertain-${variantIndex + 1}`,
      picks,
      totalOdds,
      stake: stakePerTicket,
      expectedReturn: stakePerTicket * totalOdds,
      expectedValue: 0
    }
    
    ticket.expectedValue = calculateExpectedValue(ticket, events)
    variants.push(ticket)
    variantIndex++
  }
  
  return variants
}

/**
 * Strategy 4: Budget-optimized with best expected value
 */
export function generateBudgetOptimizedTickets(
  events: EventSelection[],
  budget: number,
  maxVariants: number = 10
): TicketVariant[] {
  // Generate many variants with different combinations
  const allVariants: TicketVariant[] = []
  
  // Strategy: Cover top N most uncertain events
  for (let numUncertain = 1; numUncertain <= Math.min(3, events.length); numUncertain++) {
    const variants = generateCoverUncertainTickets(events, budget, maxVariants)
    allVariants.push(...variants)
  }
  
  // Add single best prediction
  allVariants.push(...generateSingleTicket(events, budget))
  
  // Add cover-2 if we have enough events
  if (events.length >= 2) {
    allVariants.push(...generateCover2Tickets(events, budget, 2))
  }
  
  // Sort by expected value (descending)
  const sortedVariants = allVariants.sort((a, b) => b.expectedValue - a.expectedValue)
  
  // Take top N variants that fit within budget
  const selectedVariants: TicketVariant[] = []
  let totalCost = 0
  
  for (const variant of sortedVariants) {
    if (selectedVariants.length >= maxVariants) break
    if (totalCost + variant.stake <= budget) {
      selectedVariants.push(variant)
      totalCost += variant.stake
    }
  }
  
  // If we have budget left, redistribute stakes
  if (selectedVariants.length > 0 && totalCost < budget) {
    const extraPerTicket = (budget - totalCost) / selectedVariants.length
    for (const variant of selectedVariants) {
      variant.stake += extraPerTicket
      variant.expectedReturn = variant.stake * variant.totalOdds
      variant.expectedValue = calculateExpectedValue(variant, events)
    }
  }
  
  return selectedVariants
}

/**
 * Main function to generate variants based on strategy
 */
export function generateVariants(
  events: EventSelection[],
  budget: number,
  strategy: 'single' | 'cover-2' | 'cover-uncertain' | 'budget-optimized',
  maxVariants: number = 10
): VariantsResult {
  if (events.length === 0) {
    return {
      tickets: [],
      totalCost: 0,
      coverage: {
        totalCombinations: 0,
        coveredCombinations: 0,
        coveragePercent: 0
      },
      strategy
    }
  }
  
  let tickets: TicketVariant[] = []
  
  switch (strategy) {
    case 'single':
      tickets = generateSingleTicket(events, budget)
      break
    case 'cover-2':
      tickets = generateCover2Tickets(events, budget, maxVariants)
      break
    case 'cover-uncertain':
      tickets = generateCoverUncertainTickets(events, budget, maxVariants)
      break
    case 'budget-optimized':
      tickets = generateBudgetOptimizedTickets(events, budget, maxVariants)
      break
  }
  
  const totalCost = tickets.reduce((sum, t) => sum + t.stake, 0)
  
  // Calculate coverage
  const totalCombinations = Math.pow(3, events.length) // 3 outcomes per event
  const uniqueOutcomes = new Set(tickets.map(t => 
    t.picks.map(p => `${p.eventId}:${p.outcome}`).join('|')
  ))
  const coveredCombinations = uniqueOutcomes.size
  const coveragePercent = (coveredCombinations / totalCombinations) * 100
  
  return {
    tickets,
    totalCost,
    coverage: {
      totalCombinations,
      coveredCombinations,
      coveragePercent
    },
    strategy
  }
}
