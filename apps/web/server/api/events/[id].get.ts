import { fetchTippmixEvents } from '../../utils/tippmix'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Event ID is required'
    })
  }
  
  try {
    // Fetch all events and find the specific one
    const events = await fetchTippmixEvents()
    const foundEvent = events.find(e => e.id === id)
    
    if (!foundEvent) {
      throw createError({
        statusCode: 404,
        message: 'Event not found'
      })
    }
    
    return {
      success: true,
      data: foundEvent
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    
    console.error('Error fetching event:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch event'
    })
  }
})
