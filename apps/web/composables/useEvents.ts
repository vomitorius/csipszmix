import type { TippmixEvent } from '~/server/utils/types'

export const useEvents = () => {
  const events = useState<TippmixEvent[]>('events', () => [])
  const loading = useState<boolean>('events-loading', () => false)
  const error = useState<string | null>('events-error', () => null)

  const fetchEvents = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch<{ success: boolean; data: TippmixEvent[] }>('/api/events')
      events.value = response.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch events'
      console.error('Error fetching events:', e)
    } finally {
      loading.value = false
    }
  }

  const getEventById = async (id: string): Promise<TippmixEvent | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: TippmixEvent }>(`/api/events/${id}`)
      return response.data
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch event'
      console.error('Error fetching event:', e)
      return null
    }
  }

  return {
    events: readonly(events),
    loading: readonly(loading),
    error: readonly(error),
    fetchEvents,
    getEventById
  }
}
