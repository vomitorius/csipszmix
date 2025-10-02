import { fetchTippmixEvents, saveEventsToDatabase } from '../utils/tippmix'

export default defineEventHandler(async (event) => {
  try {
    // Fetch events from Tippmix API
    const events = await fetchTippmixEvents()
    
    // Try to save to database if Supabase is configured
    try {
      await saveEventsToDatabase(events)
    } catch (dbError) {
      console.warn('Could not save to database:', dbError)
      // Continue even if database save fails
    }
    
    return {
      success: true,
      data: events,
      count: events.length
    }
  } catch (error) {
    console.error('Error in events endpoint:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch events'
    })
  }
})
