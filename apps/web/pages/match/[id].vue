<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Mérkőzés részleteinek betöltése...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">{{ error }}</p>
      <NuxtLink to="/" class="text-blue-600 hover:underline mt-2 inline-block">
        ← Vissza a főoldalra
      </NuxtLink>
    </div>

    <!-- Match details -->
    <div v-else-if="match">
      <!-- Back button -->
      <NuxtLink to="/" class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span>Vissza</span>
      </NuxtLink>

      <!-- Header -->
      <div class="mb-6">
        <div class="text-sm text-gray-500 mb-1">{{ match.matchOrder }}. meccs</div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          {{ match.home }} - {{ match.away }}
        </h1>
        <div class="text-gray-600">
          {{ match.league }} • {{ formatKickoff(match.kickoff) }}
        </div>
      </div>

      <!-- AI Prediction -->
      <div v-if="prediction" class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg mb-6 shadow-lg">
        <div class="text-sm opacity-90 mb-2">AI Javaslat</div>
        <div class="text-7xl font-bold my-6">
          {{ prediction.outcome }}
        </div>
        <div class="text-xl mb-2">
          Bizonyosság: {{ Math.round(prediction.confidence * 100) }}%
        </div>
        <div class="text-sm opacity-75">
          Hazai: {{ Math.round(prediction.probabilities.home * 100) }}% • 
          Döntetlen: {{ Math.round(prediction.probabilities.draw * 100) }}% • 
          Vendég: {{ Math.round(prediction.probabilities.away * 100) }}%
        </div>
      </div>

      <!-- No prediction yet -->
      <div v-else class="bg-gray-100 border border-gray-300 rounded-lg p-8 mb-6 text-center">
        <div class="text-gray-500 text-lg">
          Még nem érhető el predikció ehhez a mérkőzéshez
        </div>
      </div>

      <!-- Rationale -->
      <div v-if="prediction && prediction.rationale" class="bg-white p-6 rounded-lg shadow mb-6 border">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Indoklás</h2>
        <p class="text-gray-700 leading-relaxed whitespace-pre-line">
          {{ prediction.rationale }}
        </p>
      </div>

      <!-- Facts -->
      <div v-if="hasFacts" class="bg-white p-6 rounded-lg shadow mb-6 border">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Kinyert tények</h2>
        
        <!-- Injuries -->
        <div v-if="factsByType.injuries.length > 0" class="mb-4">
          <h3 class="font-semibold text-red-700 mb-2 flex items-center gap-2">
            <span>🤕</span>
            <span>Sérülések</span>
          </h3>
          <div class="space-y-1 pl-6">
            <div v-for="fact in factsByType.injuries" :key="fact.id" class="text-sm text-gray-700">
              <span class="font-medium">{{ fact.entity }}:</span> {{ fact.description }}
            </div>
          </div>
        </div>

        <!-- Suspensions -->
        <div v-if="factsByType.suspensions.length > 0" class="mb-4">
          <h3 class="font-semibold text-orange-700 mb-2 flex items-center gap-2">
            <span>🟥</span>
            <span>Eltiltások</span>
          </h3>
          <div class="space-y-1 pl-6">
            <div v-for="fact in factsByType.suspensions" :key="fact.id" class="text-sm text-gray-700">
              <span class="font-medium">{{ fact.entity }}:</span> {{ fact.description }}
            </div>
          </div>
        </div>

        <!-- Form -->
        <div v-if="factsByType.form.length > 0" class="mb-4">
          <h3 class="font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <span>📊</span>
            <span>Forma</span>
          </h3>
          <div class="space-y-1 pl-6">
            <div v-for="fact in factsByType.form" :key="fact.id" class="text-sm text-gray-700">
              <span class="font-medium">{{ fact.entity }}:</span> {{ fact.description }}
            </div>
          </div>
        </div>

        <!-- Coach changes -->
        <div v-if="factsByType.coachChanges.length > 0" class="mb-4">
          <h3 class="font-semibold text-purple-700 mb-2 flex items-center gap-2">
            <span>👔</span>
            <span>Edzőváltások</span>
          </h3>
          <div class="space-y-1 pl-6">
            <div v-for="fact in factsByType.coachChanges" :key="fact.id" class="text-sm text-gray-700">
              <span class="font-medium">{{ fact.entity }}:</span> {{ fact.description }}
            </div>
          </div>
        </div>

        <!-- Other facts -->
        <div v-if="factsByType.other.length > 0" class="mb-4">
          <h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Egyéb információk</span>
          </h3>
          <div class="space-y-1 pl-6">
            <div v-for="fact in factsByType.other" :key="fact.id" class="text-sm text-gray-700">
              <span class="font-medium">{{ fact.entity }}:</span> {{ fact.description }}
            </div>
          </div>
        </div>
      </div>

      <!-- No facts -->
      <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
        <div class="text-gray-500">
          Még nincsenek kinyert tények ehhez a mérkőzéshez
        </div>
      </div>

      <!-- Sources -->
      <div v-if="sources.length > 0" class="bg-white p-6 rounded-lg shadow border">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Források</h2>
        <div class="space-y-3">
          <a 
            v-for="source in sources" 
            :key="source.id"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-start gap-3 text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span class="text-xl">🔗</span>
            <div class="flex-1">
              <div>{{ source.title || source.url }}</div>
              <div class="text-xs text-gray-500">
                {{ formatDate(source.date) }}
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match, Prediction, Source, Fact } from '~/server/utils/types'

const route = useRoute()
const matchId = route.params.id as string

// State
const match = ref<Match | null>(null)
const prediction = ref<Prediction | null>(null)
const sources = ref<Source[]>([])
const factsByType = ref<{
  injuries: Fact[]
  suspensions: Fact[]
  form: Fact[]
  coachChanges: Fact[]
  other: Fact[]
}>({
  injuries: [],
  suspensions: [],
  form: [],
  coachChanges: [],
  other: []
})
const loading = ref(true)
const error = ref<string | null>(null)

// Computed
const hasFacts = computed(() => {
  return factsByType.value.injuries.length > 0 ||
         factsByType.value.suspensions.length > 0 ||
         factsByType.value.form.length > 0 ||
         factsByType.value.coachChanges.length > 0 ||
         factsByType.value.other.length > 0
})

// Functions
function formatKickoff(kickoff: string): string {
  const date = new Date(kickoff)
  const dayOfWeek = date.toLocaleDateString('hu-HU', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
  const time = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
  return `${dayOfWeek}, ${dateStr}, ${time}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Fetch match details
async function fetchMatchDetails() {
  loading.value = true
  error.value = null
  
  try {
    const response = await $fetch<{
      success: boolean
      data: {
        match: Match
        prediction: Prediction | null
        sources: Source[]
        facts: Fact[]
        factsByType: {
          injuries: Fact[]
          suspensions: Fact[]
          form: Fact[]
          coachChanges: Fact[]
          other: Fact[]
        }
      }
    }>(`/api/matches/${matchId}`)
    
    match.value = response.data.match
    prediction.value = response.data.prediction
    sources.value = response.data.sources
    factsByType.value = response.data.factsByType
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch match details'
    console.error('Error fetching match:', e)
  } finally {
    loading.value = false
  }
}

// Fetch on mount
onMounted(() => {
  fetchMatchDetails()
})

// Set page metadata
useHead(() => ({
  title: match.value 
    ? `${match.value.home} - ${match.value.away} | Magyar Totó AI` 
    : 'Mérkőzés részletek | Magyar Totó AI',
  meta: [
    {
      name: 'description',
      content: match.value
        ? `AI predikció és részletes elemzés: ${match.value.home} - ${match.value.away}`
        : 'Mérkőzés részletek és AI predikció'
    }
  ]
}))
</script>
