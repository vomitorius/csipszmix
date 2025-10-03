import { chatCompletion, logTokenUsage } from './llm'
import { z } from 'zod'
import type { TippmixEvent, Fact } from './types'

/**
 * Prediction utilities - combines odds, facts, and LLM analysis
 * to generate match outcome predictions
 */

// Zod schema for LLM prediction response
const LLMPredictionSchema = z.object({
  outcome: z.enum(['1', 'X', '2']),
  confidence: z.number().min(0).max(1),
  probs: z.object({
    '1': z.number().min(0).max(1),
    'X': z.number().min(0).max(1),
    '2': z.number().min(0).max(1)
  }),
  rationale: z.string(),
  key_factors: z.array(z.string())
})

export type LLMPrediction = z.infer<typeof LLMPredictionSchema>

export interface PredictionResult {
  outcome: '1' | 'X' | '2'
  probabilities: {
    home: number
    draw: number
    away: number
  }
  confidence: number
  rationale: string
  keyFactors: string[]
  method: 'baseline' | 'facts' | 'llm' | 'ensemble'
}

/**
 * Convert decimal odds to implied probabilities with overround removal
 */
export function oddsToProbs(odds: { home: number; draw: number; away: number }): {
  home: number
  draw: number
  away: number
} {
  // Calculate implied probabilities (inverse of odds)
  const impliedHome = 1 / odds.home
  const impliedDraw = 1 / odds.draw
  const impliedAway = 1 / odds.away
  
  // Sum of implied probabilities (includes bookmaker margin/overround)
  const total = impliedHome + impliedDraw + impliedAway
  
  // Normalize to remove overround (fair probabilities)
  return {
    home: impliedHome / total,
    draw: impliedDraw / total,
    away: impliedAway / total
  }
}

/**
 * Calculate form score from recent results
 */
function calculateFormScore(results: Array<'W' | 'L' | 'D'>): number {
  if (!results || results.length === 0) return 0
  
  const points = results.map(r => {
    switch (r) {
      case 'W': return 3
      case 'D': return 1
      case 'L': return 0
      default: return 0
    }
  })
  
  return points.reduce((sum, p) => sum + p, 0) / (results.length * 3) // Normalize to 0-1
}

/**
 * Adjust probabilities based on extracted facts
 */
export function adjustProbsForFacts(
  baseProbs: { home: number; draw: number; away: number },
  facts: any[],
  homeTeam: string,
  awayTeam: string
): { home: number; draw: number; away: number } {
  let homeAdjust = 0
  let awayAdjust = 0
  
  // Group facts by team
  const homeFacts = facts.filter(f => 
    f.entity?.toLowerCase().includes(homeTeam.toLowerCase())
  )
  const awayFacts = facts.filter(f => 
    f.entity?.toLowerCase().includes(awayTeam.toLowerCase())
  )
  
  // Process injuries - key positions have higher impact
  const homeInjuries = homeFacts.filter(f => f.fact_type === 'injury')
  const awayInjuries = awayFacts.filter(f => f.fact_type === 'injury')
  
  homeAdjust -= homeInjuries.length * 0.03 // -3% per injury
  awayAdjust -= awayInjuries.length * 0.03
  
  // Process suspensions - similar impact to injuries
  const homeSuspensions = homeFacts.filter(f => f.fact_type === 'suspension')
  const awaySuspensions = awayFacts.filter(f => f.fact_type === 'suspension')
  
  homeAdjust -= homeSuspensions.length * 0.03
  awayAdjust -= awaySuspensions.length * 0.03
  
  // Process form
  const homeForm = homeFacts.find(f => f.fact_type === 'form')
  const awayForm = awayFacts.find(f => f.fact_type === 'form')
  
  if (homeForm && homeForm.description) {
    // Try to extract form from description (e.g., "W-L-D-W-L")
    const formMatch = homeForm.description.match(/([WLD])-([WLD])-([WLD])-([WLD])-([WLD])/i)
    if (formMatch) {
      const results = formMatch.slice(1, 6) as Array<'W' | 'L' | 'D'>
      const formScore = calculateFormScore(results)
      homeAdjust += (formScore - 0.5) * 0.1 // Adjust by up to ±5%
    }
  }
  
  if (awayForm && awayForm.description) {
    const formMatch = awayForm.description.match(/([WLD])-([WLD])-([WLD])-([WLD])-([WLD])/i)
    if (formMatch) {
      const results = formMatch.slice(1, 6) as Array<'W' | 'L' | 'D'>
      const formScore = calculateFormScore(results)
      awayAdjust += (formScore - 0.5) * 0.1
    }
  }
  
  // Process coach changes
  const homeCoachChange = homeFacts.find(f => f.fact_type === 'coach_change')
  const awayCoachChange = awayFacts.find(f => f.fact_type === 'coach_change')
  
  if (homeCoachChange) {
    homeAdjust -= 0.05 // New coach penalty
  }
  if (awayCoachChange) {
    awayAdjust -= 0.05
  }
  
  // Apply home advantage (+10% for home team)
  homeAdjust += 0.10
  
  // Calculate adjusted probabilities
  let adjustedHome = Math.max(0.05, Math.min(0.90, baseProbs.home + homeAdjust))
  let adjustedAway = Math.max(0.05, Math.min(0.90, baseProbs.away + awayAdjust))
  let adjustedDraw = Math.max(0.05, 1 - adjustedHome - adjustedAway)
  
  // Normalize to ensure they sum to 1
  const total = adjustedHome + adjustedDraw + adjustedAway
  
  return {
    home: adjustedHome / total,
    draw: adjustedDraw / total,
    away: adjustedAway / total
  }
}

/**
 * Create LLM prediction prompt
 */
function createPredictionPrompt(
  event: TippmixEvent,
  baseProbs: { home: number; draw: number; away: number },
  factsContext: string,
  ragContext?: string
): string {
  return `You are a football match prediction expert. Based on the following data, predict the match outcome (1=Home Win, X=Draw, 2=Away Win).

Match: ${event.home} vs ${event.away}
League: ${event.league}
Kickoff: ${event.startTime}

Odds (market baseline):
- Home Win (1): ${event.odds.home} (implied prob: ${(baseProbs.home * 100).toFixed(1)}%)
- Draw (X): ${event.odds.draw} (implied prob: ${(baseProbs.draw * 100).toFixed(1)}%)
- Away Win (2): ${event.odds.away} (implied prob: ${(baseProbs.away * 100).toFixed(1)}%)

Key Facts:
${factsContext}

${ragContext ? `Additional Context:\n${ragContext}\n` : ''}

Provide your prediction with reasoning. Return JSON with this exact structure:
{
  "outcome": "1" | "X" | "2",
  "confidence": 0.0-1.0,
  "probs": {
    "1": 0.45,
    "X": 0.28,
    "2": 0.27
  },
  "rationale": "2-3 sentence explanation citing key factors",
  "key_factors": ["factor1", "factor2", "factor3"]
}`
}

/**
 * Generate baseline prediction from odds only
 */
export async function predictBaseline(event: TippmixEvent): Promise<PredictionResult> {
  const probs = oddsToProbs(event.odds)
  
  // Determine outcome (highest probability)
  let outcome: '1' | 'X' | '2' = '1'
  let maxProb = probs.home
  
  if (probs.draw > maxProb) {
    outcome = 'X'
    maxProb = probs.draw
  }
  if (probs.away > maxProb) {
    outcome = '2'
    maxProb = probs.away
  }
  
  // Calculate confidence based on probability margin
  const sortedProbs = [probs.home, probs.draw, probs.away].sort((a, b) => b - a)
  const margin = sortedProbs[0] - sortedProbs[1]
  const confidence = Math.min(0.5 + margin, 1.0) // Base confidence + margin
  
  return {
    outcome,
    probabilities: probs,
    confidence,
    rationale: `Market odds suggest ${outcome === '1' ? 'home win' : outcome === 'X' ? 'draw' : 'away win'} with ${(maxProb * 100).toFixed(1)}% implied probability. This is a baseline prediction based purely on bookmaker odds.`,
    keyFactors: ['Bookmaker odds', 'Market consensus', 'No additional context'],
    method: 'baseline'
  }
}

/**
 * Generate prediction adjusted by facts
 */
export async function predictWithFacts(
  event: TippmixEvent,
  facts: any[]
): Promise<PredictionResult> {
  const baseProbs = oddsToProbs(event.odds)
  const adjustedProbs = adjustProbsForFacts(baseProbs, facts, event.home, event.away)
  
  // Determine outcome
  let outcome: '1' | 'X' | '2' = '1'
  let maxProb = adjustedProbs.home
  
  if (adjustedProbs.draw > maxProb) {
    outcome = 'X'
    maxProb = adjustedProbs.draw
  }
  if (adjustedProbs.away > maxProb) {
    outcome = '2'
    maxProb = adjustedProbs.away
  }
  
  // Calculate confidence
  const sortedProbs = [adjustedProbs.home, adjustedProbs.draw, adjustedProbs.away].sort((a, b) => b - a)
  const margin = sortedProbs[0] - sortedProbs[1]
  const confidence = Math.min(0.6 + margin, 1.0)
  
  // Generate rationale based on facts
  const keyFactors: string[] = []
  const injuries = facts.filter(f => f.fact_type === 'injury')
  const suspensions = facts.filter(f => f.fact_type === 'suspension')
  
  if (injuries.length > 0) {
    keyFactors.push(`${injuries.length} injury/injuries affecting lineup`)
  }
  if (suspensions.length > 0) {
    keyFactors.push(`${suspensions.length} player(s) suspended`)
  }
  keyFactors.push('Home advantage factor applied')
  
  const rationale = `Based on ${facts.length} extracted facts, the adjusted probabilities favor ${outcome === '1' ? event.home : outcome === '2' ? event.away : 'a draw'}. ${keyFactors[0]}. Odds baseline adjusted by recent form and team news.`
  
  return {
    outcome,
    probabilities: adjustedProbs,
    confidence,
    rationale,
    keyFactors,
    method: 'facts'
  }
}

/**
 * Generate prediction using LLM
 */
export async function predictWithLLM(
  event: TippmixEvent,
  facts: any[],
  ragContext?: string
): Promise<PredictionResult> {
  const baseProbs = oddsToProbs(event.odds)
  
  // Format facts for context
  const factsContext = facts.length > 0
    ? facts.map(f => `- ${f.fact_type.toUpperCase()}: ${f.description}`).join('\n')
    : 'No specific facts available'
  
  const prompt = createPredictionPrompt(event, baseProbs, factsContext, ragContext)
  
  try {
    const response = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are an expert football analyst. Analyze matches and provide predictions in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.3, // Lower temperature for more consistent predictions
        maxTokens: 1000,
        jsonMode: true
      }
    )
    
    // Log token usage
    if (response.usage) {
      logTokenUsage('prediction_llm', response.usage)
    }
    
    // Parse and validate response
    const parsed = JSON.parse(response.content)
    const validated = LLMPredictionSchema.parse(parsed)
    
    return {
      outcome: validated.outcome,
      probabilities: {
        home: validated.probs['1'],
        draw: validated.probs['X'],
        away: validated.probs['2']
      },
      confidence: validated.confidence,
      rationale: validated.rationale,
      keyFactors: validated.key_factors,
      method: 'llm'
    }
  } catch (error) {
    console.error('Error in LLM prediction:', error)
    // Fall back to facts-based prediction
    return predictWithFacts(event, facts)
  }
}

/**
 * Generate ensemble prediction combining multiple methods
 */
export async function predictEnsemble(
  event: TippmixEvent,
  facts: any[],
  ragContext?: string
): Promise<PredictionResult> {
  // Get predictions from all methods
  const [baseline, factsBased, llmBased] = await Promise.all([
    predictBaseline(event),
    predictWithFacts(event, facts),
    predictWithLLM(event, facts, ragContext).catch(() => factsBased) // Fallback to facts if LLM fails
  ])
  
  // Define weights for ensemble
  const weights = {
    baseline: 0.3,
    facts: 0.3,
    llm: 0.4
  }
  
  // Weighted average of probabilities
  const ensembleProbs = {
    home: 
      baseline.probabilities.home * weights.baseline +
      factsBased.probabilities.home * weights.facts +
      llmBased.probabilities.home * weights.llm,
    draw:
      baseline.probabilities.draw * weights.baseline +
      factsBased.probabilities.draw * weights.facts +
      llmBased.probabilities.draw * weights.llm,
    away:
      baseline.probabilities.away * weights.baseline +
      factsBased.probabilities.away * weights.facts +
      llmBased.probabilities.away * weights.llm
  }
  
  // Determine outcome
  let outcome: '1' | 'X' | '2' = '1'
  let maxProb = ensembleProbs.home
  
  if (ensembleProbs.draw > maxProb) {
    outcome = 'X'
    maxProb = ensembleProbs.draw
  }
  if (ensembleProbs.away > maxProb) {
    outcome = '2'
    maxProb = ensembleProbs.away
  }
  
  // Average confidence
  const avgConfidence = (
    baseline.confidence * weights.baseline +
    factsBased.confidence * weights.facts +
    llmBased.confidence * weights.llm
  )
  
  // Combine key factors (unique)
  const allFactors = [
    ...baseline.keyFactors,
    ...factsBased.keyFactors,
    ...llmBased.keyFactors
  ]
  const uniqueFactors = Array.from(new Set(allFactors)).slice(0, 5)
  
  return {
    outcome,
    probabilities: ensembleProbs,
    confidence: avgConfidence,
    rationale: `Ensemble prediction combining odds analysis (${(weights.baseline * 100).toFixed(0)}%), facts-based adjustment (${(weights.facts * 100).toFixed(0)}%), and AI analysis (${(weights.llm * 100).toFixed(0)}%). ${llmBased.rationale.substring(0, 150)}...`,
    keyFactors: uniqueFactors,
    method: 'ensemble'
  }
}

/**
 * Main prediction function - routes to appropriate strategy
 */
export async function generatePrediction(
  event: TippmixEvent,
  facts: any[],
  options: {
    strategy?: 'baseline' | 'facts' | 'llm' | 'ensemble'
    ragContext?: string
  } = {}
): Promise<PredictionResult> {
  const strategy = options.strategy || 'ensemble'
  
  switch (strategy) {
    case 'baseline':
      return predictBaseline(event)
    case 'facts':
      return predictWithFacts(event, facts)
    case 'llm':
      return predictWithLLM(event, facts, options.ragContext)
    case 'ensemble':
      return predictEnsemble(event, facts, options.ragContext)
    default:
      return predictBaseline(event)
  }
}
