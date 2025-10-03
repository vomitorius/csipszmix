<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Magyar Totó - {{ weekLabel }}</h1>
      <p class="text-gray-600">
        {{ weekDateRange }}
      </p>
    </div>

    <DisclaimerBanner />

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Heti mérkőzések betöltése...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <!-- No matches state -->
    <div v-else-if="matches.length === 0" class="text-center py-12">
      <p class="text-gray-600">Nincsenek elérhető meccsek erre a hétre.</p>
    </div>

    <!-- Matches list -->
    <div v-else>
      <!-- Match list -->
      <div class="space-y-2 mb-8">
        <MatchRow 
          v-for="match in matches" 
          :key="match.id"
          :match="match"
          :prediction="predictions[match.id]"
        />
      </div>

      <!-- Recommended ticket summary -->
      <div v-if="hasAllPredictions" class="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Javasolt tipposzlop</h3>
        <div class="text-3xl font-mono font-bold text-blue-900 mb-4">
          {{ recommendedTicket }}
        </div>
        <div class="text-sm text-gray-600 mb-4">
          Ez a javasolt tipposzlop az AI predikciók alapján, a legmagasabb bizonyosságú kimenetelekkel.
        </div>
        <NuxtLink 
          to="/variants" 
          class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Variációk megtekintése</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { currentRound, matches, predictions, loading, error, getCurrentWeekRound } = useRounds()

// Computed properties
const weekLabel = computed(() => currentRound.value?.weekLabel || 'Betöltés...')

const weekDateRange = computed(() => {
  if (!currentRound.value) return ''
  const start = new Date(currentRound.value.weekStart).toLocaleDateString('hu-HU', { 
    month: 'long', 
    day: 'numeric' 
  })
  const end = new Date(currentRound.value.weekEnd).toLocaleDateString('hu-HU', { 
    month: 'long', 
    day: 'numeric' 
  })
  return `${start} - ${end}`
})

const hasAllPredictions = computed(() => {
  return matches.value.length > 0 && 
         matches.value.every(match => predictions.value[match.id])
})

const recommendedTicket = computed(() => {
  if (!hasAllPredictions.value) return ''
  
  return matches.value
    .sort((a, b) => a.matchOrder - b.matchOrder)
    .map(match => predictions.value[match.id]?.outcome || '?')
    .join('-')
})

// Fetch current week round on mount
onMounted(() => {
  getCurrentWeekRound()
})

// Set page metadata
useHead({
  title: 'Magyar Totó AI - Heti mérkőzés előrejelző',
  meta: [
    {
      name: 'description',
      content: 'AI-alapú heti Magyar Totó mérkőzés előrejelző rendszer. 13+1 meccs predikciók és tipposzlop variációk.'
    }
  ]
})
</script>
