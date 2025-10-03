<template>
  <NuxtLink :to="`/match/${match.id}`">
    <div class="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
      <!-- Match order -->
      <div class="w-8 text-center text-gray-500 font-semibold">
        {{ match.matchOrder }}.
      </div>
      
      <!-- Match details -->
      <div class="flex-1">
        <div class="font-semibold text-gray-900">
          {{ match.home }} - {{ match.away }}
        </div>
        <div class="text-sm text-gray-500">
          {{ match.league }} • {{ formatKickoff(match.kickoff) }}
        </div>
      </div>
      
      <!-- AI Prediction -->
      <div v-if="prediction" class="flex items-center gap-3">
        <div class="text-center">
          <div 
            class="text-2xl font-bold" 
            :class="getTipClass(prediction.outcome)"
          >
            {{ prediction.outcome }}
          </div>
          <div class="text-xs text-gray-500">
            {{ Math.round(prediction.confidence * 100) }}%
          </div>
        </div>
      </div>
      
      <!-- No prediction yet -->
      <div v-else class="text-gray-400 text-2xl">
        ?
      </div>
      
      <!-- Arrow indicator -->
      <div class="text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Match, Prediction } from '~/server/utils/types'

const props = defineProps<{
  match: Match
  prediction?: Prediction | null
}>()

function formatKickoff(kickoff: string): string {
  const date = new Date(kickoff)
  const now = new Date()
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // Format date
  const dayOfWeek = date.toLocaleDateString('hu-HU', { weekday: 'short' })
  const time = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
  
  if (diffDays === 0) {
    return `Ma, ${time}`
  } else if (diffDays === 1) {
    return `Holnap, ${time}`
  } else {
    const dateStr = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
    return `${dayOfWeek}, ${dateStr} ${time}`
  }
}

function getTipClass(outcome: '1' | 'X' | '2'): string {
  const baseClass = 'transition-colors'
  
  switch (outcome) {
    case '1':
      return `${baseClass} text-green-600`
    case 'X':
      return `${baseClass} text-yellow-600`
    case '2':
      return `${baseClass} text-blue-600`
    default:
      return baseClass
  }
}
</script>
