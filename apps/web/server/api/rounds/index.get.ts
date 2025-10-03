import { defineEventHandler, createError } from 'h3'
import { getSupabaseClient } from '../../utils/supabase'
import type { TotoRound } from '../../utils/types'

/**
 * GET /api/rounds
 * List all Magyar Totó rounds (weeks)
 */
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()

  try {
    console.log('[API] Fetching Totó rounds...')

    // Fetch rounds from database
    const { data: rounds, error } = await supabase
      .from('toto_rounds')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[API] Error fetching rounds:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch rounds'
      })
    }

    // Convert database format to API format
    const formattedRounds: TotoRound[] = (rounds || []).map(round => ({
      id: round.id,
      weekNumber: round.week_number,
      weekLabel: round.week_label,
      weekStart: round.week_start,
      weekEnd: round.week_end,
      year: round.year,
      status: round.status,
      createdAt: round.created_at,
      updatedAt: round.updated_at
    }))

    console.log(`[API] Successfully fetched ${formattedRounds.length} rounds`)

    return {
      success: true,
      data: formattedRounds
    }
  } catch (error: any) {
    console.error('[API] Error in rounds endpoint:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch rounds'
    })
  }
})
