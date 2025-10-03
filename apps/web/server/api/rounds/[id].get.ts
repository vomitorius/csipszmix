import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getSupabaseClient } from '../../utils/supabase'
import type { TotoRound, Match, Prediction } from '../../utils/types'

/**
 * GET /api/rounds/[id]
 * Get a specific Totó round with its matches and predictions
 */
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  const roundId = getRouterParam(event, 'id')

  if (!roundId) {
    throw createError({
      statusCode: 400,
      message: 'Round ID is required'
    })
  }

  try {
    console.log(`[API] Fetching round ${roundId}...`)

    // Fetch round
    const { data: round, error: roundError } = await supabase
      .from('toto_rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      console.error('[API] Round not found:', roundError)
      throw createError({
        statusCode: 404,
        message: 'Round not found'
      })
    }

    // Fetch matches for this round
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('round_id', roundId)
      .order('match_order', { ascending: true })

    if (matchesError) {
      console.error('[API] Error fetching matches:', matchesError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch matches'
      })
    }

    // Fetch predictions for these matches
    const matchIds = (matches || []).map(m => m.id)
    let predictions: any[] = []
    
    if (matchIds.length > 0) {
      const { data: preds, error: predsError } = await supabase
        .from('predictions')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      if (!predsError) {
        predictions = preds || []
      }
    }

    // Build predictions map
    const predictionMap: Record<string, Prediction> = {}
    predictions.forEach(pred => {
      if (pred.match_id) {
        predictionMap[pred.match_id] = {
          id: pred.id,
          matchId: pred.match_id,
          outcome: pred.outcome,
          probabilities: {
            home: pred.prob_home,
            draw: pred.prob_draw,
            away: pred.prob_away
          },
          rationale: pred.rationale,
          topSources: pred.top_sources || [],
          confidence: pred.confidence,
          createdAt: pred.created_at,
          updatedAt: pred.updated_at
        }
      }
    })

    // Format response
    const formattedMatches: Match[] = (matches || []).map(match => ({
      id: match.id,
      roundId: match.round_id,
      matchOrder: match.match_order,
      league: match.league,
      home: match.home,
      away: match.away,
      kickoff: match.kickoff,
      oddsHome: match.odds_home,
      oddsDraw: match.odds_draw,
      oddsAway: match.odds_away,
      status: match.status,
      createdAt: match.created_at,
      updatedAt: match.updated_at
    }))

    const formattedRound: TotoRound = {
      id: round.id,
      weekNumber: round.week_number,
      weekLabel: round.week_label,
      weekStart: round.week_start,
      weekEnd: round.week_end,
      year: round.year,
      status: round.status,
      matches: formattedMatches,
      createdAt: round.created_at,
      updatedAt: round.updated_at
    }

    console.log(`[API] Successfully fetched round with ${formattedMatches.length} matches`)

    return {
      success: true,
      data: {
        round: formattedRound,
        predictions: predictionMap
      }
    }
  } catch (error: any) {
    console.error('[API] Error in round detail endpoint:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch round'
    })
  }
})
