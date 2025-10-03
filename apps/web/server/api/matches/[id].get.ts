import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getSupabaseClient } from '../../utils/supabase'
import type { Match, Prediction, Source, Fact } from '../../utils/types'

/**
 * GET /api/matches/[id]
 * Get detailed information about a specific match
 * Includes: match data, prediction, sources, and extracted facts
 */
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  const matchId = getRouterParam(event, 'id')

  if (!matchId) {
    throw createError({
      statusCode: 400,
      message: 'Match ID is required'
    })
  }

  try {
    console.log(`[API] Fetching match ${matchId}...`)

    // Fetch match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      console.error('[API] Match not found:', matchError)
      throw createError({
        statusCode: 404,
        message: 'Match not found'
      })
    }

    // Fetch prediction
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(1)

    const prediction = predictions && predictions.length > 0 ? predictions[0] : null

    // Fetch sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, url, title, published_date, created_at')
      .eq('match_id', matchId)
      .order('published_date', { ascending: false })

    // Fetch facts
    const { data: facts, error: factsError } = await supabase
      .from('facts')
      .select('*')
      .eq('match_id', matchId)
      .order('confidence', { ascending: false })

    // Format response
    const formattedMatch: Match = {
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
    }

    const formattedPrediction: Prediction | null = prediction ? {
      id: prediction.id,
      matchId: prediction.match_id,
      outcome: prediction.outcome,
      probabilities: {
        home: prediction.prob_home,
        draw: prediction.prob_draw,
        away: prediction.prob_away
      },
      rationale: prediction.rationale,
      topSources: prediction.top_sources || [],
      confidence: prediction.confidence,
      createdAt: prediction.created_at,
      updatedAt: prediction.updated_at
    } : null

    const formattedSources: Source[] = (sources || []).map(source => ({
      id: source.id,
      matchId: matchId,
      url: source.url,
      title: source.title || '',
      date: source.published_date || source.created_at,
      content: '',
      createdAt: source.created_at
    }))

    const formattedFacts: Fact[] = (facts || []).map(fact => ({
      id: fact.id,
      matchId: fact.match_id,
      sourceId: fact.source_id,
      type: fact.fact_type,
      entity: fact.entity,
      description: fact.description,
      confidence: fact.confidence,
      extractedAt: fact.extracted_at
    }))

    // Group facts by type
    const factsByType = {
      injuries: formattedFacts.filter(f => f.type === 'injury'),
      suspensions: formattedFacts.filter(f => f.type === 'suspension'),
      form: formattedFacts.filter(f => f.type === 'form'),
      coachChanges: formattedFacts.filter(f => f.type === 'coach_change'),
      other: formattedFacts.filter(f => f.type === 'other')
    }

    console.log(`[API] Successfully fetched match with ${formattedSources.length} sources and ${formattedFacts.length} facts`)

    return {
      success: true,
      data: {
        match: formattedMatch,
        prediction: formattedPrediction,
        sources: formattedSources,
        facts: formattedFacts,
        factsByType
      }
    }
  } catch (error: any) {
    console.error('[API] Error in match detail endpoint:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch match'
    })
  }
})
