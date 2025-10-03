import type { TotoRound, Match, Prediction } from '~/server/utils/types'

export const useRounds = () => {
  const rounds = useState<TotoRound[]>('rounds', () => [])
  const currentRound = useState<TotoRound | null>('currentRound', () => null)
  const matches = useState<Match[]>('matches', () => [])
  const predictions = useState<Record<string, Prediction>>('predictions', () => ({}))
  const loading = useState<boolean>('rounds-loading', () => false)
  const error = useState<string | null>('rounds-error', () => null)

  const fetchRounds = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch<{ success: boolean; data: TotoRound[] }>('/api/rounds')
      rounds.value = response.data
      
      // Set current round as the first one (most recent)
      if (response.data.length > 0) {
        currentRound.value = response.data[0]
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch rounds'
      console.error('Error fetching rounds:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchRoundById = async (roundId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch<{ 
        success: boolean; 
        data: { 
          round: TotoRound; 
          predictions: Record<string, Prediction> 
        } 
      }>(`/api/rounds/${roundId}`)
      
      currentRound.value = response.data.round
      matches.value = response.data.round.matches || []
      predictions.value = response.data.predictions
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch round'
      console.error('Error fetching round:', e)
    } finally {
      loading.value = false
    }
  }

  const getCurrentWeekRound = async () => {
    // For now, just fetch all rounds and take the first one
    await fetchRounds()
    
    if (rounds.value.length > 0) {
      await fetchRoundById(rounds.value[0].id)
    }
  }

  return {
    rounds: readonly(rounds),
    currentRound: readonly(currentRound),
    matches: readonly(matches),
    predictions: readonly(predictions),
    loading: readonly(loading),
    error: readonly(error),
    fetchRounds,
    fetchRoundById,
    getCurrentWeekRound
  }
}
