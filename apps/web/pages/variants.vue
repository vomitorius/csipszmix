<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Tipposzlop Variációk</h1>
      <p class="text-gray-600">
        {{ weekLabel }} - Költségkeret alapú fedezeti stratégiák
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
      <NuxtLink to="/" class="mt-4 inline-block text-blue-600 hover:text-blue-700">
        ← Vissza a főoldalra
      </NuxtLink>
    </div>

    <!-- Variant Generator -->
    <div v-else>
      <!-- Budget Selector -->
      <div class="bg-white p-6 rounded-lg shadow mb-6 border">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Költségkeret (HUF)
        </label>
        <div class="flex gap-4 items-end">
          <input 
            v-model.number="budget"
            type="number"
            step="100"
            min="300"
            max="100000"
            class="flex-1 max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            @click="generateVariants"
            :disabled="!hasAllPredictions || generatingVariants"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="generatingVariants">Generálás...</span>
            <span v-else>Variációk generálása</span>
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          Minimum: 300 Ft • Ajánlott: 1000-5000 Ft
        </p>
        
        <div v-if="!hasAllPredictions" class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-yellow-800 text-sm">
            ⚠️ Még nem állnak rendelkezésre predikciók minden meccshez. Kérjük, várjon, amíg az AI elemzés befejeződik.
          </p>
        </div>
      </div>

      <!-- Generated variants -->
      <div v-if="variants.length > 0" class="space-y-4">
        <h2 class="text-xl font-semibold">Generált Variációk</h2>
        
        <div 
          v-for="(variant, i) in variants" 
          :key="i"
          class="bg-white p-6 rounded-lg shadow border"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Variáció #{{ i + 1 }}</h3>
            <span class="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">
              {{ variant.stake }} Ft
            </span>
          </div>

          <!-- Tipposzlop -->
          <div class="mb-4">
            <div class="text-3xl font-mono font-bold text-gray-900 mb-2">
              {{ variant.picksString }}
            </div>
            <p class="text-sm text-gray-600">
              Stratégia: {{ getStrategyLabel(variant.strategy) }}
            </p>
          </div>

          <!-- Match predictions -->
          <div class="space-y-1 mb-4">
            <div 
              v-for="pick in variant.picks" 
              :key="pick.matchId"
              class="flex items-center justify-between text-sm py-1"
            >
              <span class="text-gray-600">
                {{ pick.order }}. {{ pick.home }} - {{ pick.away }}
              </span>
              <span 
                class="font-bold px-2 py-0.5 rounded"
                :class="getOutcomeClass(pick.outcome)"
              >
                {{ pick.outcome }}
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p class="text-xs text-gray-500">Összes szorzó</p>
              <p class="font-bold text-gray-900">{{ variant.totalOdds?.toFixed(2) || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Várható nyeremény</p>
              <p class="font-bold text-green-600">{{ variant.expectedReturn.toLocaleString('hu-HU') }} Ft</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Átlag bizonyosság</p>
              <p class="font-bold text-blue-600">
                {{ (variant.avgConfidence * 100).toFixed(0) }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6">
          <h3 class="font-semibold text-gray-900 mb-4">Összegzés</h3>
          <div class="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-gray-600">Összes variáció</p>
              <p class="text-xl font-bold text-gray-900">{{ variants.length }} db</p>
            </div>
            <div>
              <p class="text-gray-600">Teljes költség</p>
              <p class="text-xl font-bold text-gray-900">{{ totalCost.toLocaleString('hu-HU') }} Ft</p>
            </div>
            <div>
              <p class="text-gray-600">Várható össznyeremény</p>
              <p class="text-xl font-bold text-green-600">{{ totalExpectedReturn.toLocaleString('hu-HU') }} Ft</p>
            </div>
            <div>
              <p class="text-gray-600">Fedezettség</p>
              <p class="text-xl font-bold text-blue-600">{{ coveragePercent.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Match, Prediction } from '~/server/utils/types'

const { currentRound, matches, predictions, loading, error, getCurrentWeekRound } = useRounds()

// State
const budget = ref(1000)
const generatingVariants = ref(false)
const variants = ref<any[]>([])

// Computed
const weekLabel = computed(() => currentRound.value?.weekLabel || 'Betöltés...')

const hasAllPredictions = computed(() => {
  return matches.value.length > 0 && 
         matches.value.every(match => predictions.value[match.id])
})

const totalCost = computed(() => {
  return variants.value.reduce((sum, v) => sum + v.stake, 0)
})

const totalExpectedReturn = computed(() => {
  return variants.value.reduce((sum, v) => sum + v.expectedReturn, 0)
})

const coveragePercent = computed(() => {
  if (variants.value.length === 0) return 0
  
  // Calculate how many unique outcome combinations we're covering
  // For simplicity, just return a percentage based on number of variants vs possible combinations
  const matchCount = matches.value.length
  const totalPossibleCombinations = Math.pow(3, matchCount)
  const coverageRatio = Math.min(variants.value.length / totalPossibleCombinations, 1)
  
  return coverageRatio * 100
})

// Functions
function getStrategyLabel(strategy: string): string {
  const labels: Record<string, string> = {
    'single': 'Egyszerű - legbiztosabb kimenetel',
    'cover-uncertain': 'Fedezés - bizonytalan meccsek',
    'budget-optimized': 'Budget optimalizált',
    'balanced': 'Kiegyensúlyozott'
  }
  return labels[strategy] || strategy
}

function getOutcomeClass(outcome: '1' | 'X' | '2'): string {
  const classes = {
    '1': 'bg-green-100 text-green-700',
    'X': 'bg-yellow-100 text-yellow-700',
    '2': 'bg-blue-100 text-blue-700'
  }
  return classes[outcome] || 'bg-gray-100 text-gray-700'
}

async function generateVariants() {
  if (!hasAllPredictions.value || generatingVariants.value) return
  
  generatingVariants.value = true
  
  try {
    // Get all match IDs
    const matchIds = matches.value.map(m => m.id)
    
    // Call variants API (we need to adapt this to work with matches instead of events)
    const response = await $fetch('/api/variants', {
      method: 'POST',
      body: {
        event_ids: matchIds,  // For now, use the same API
        budget_huf: budget.value,
        strategy: 'budget-optimized',
        max_variants: 10
      }
    })
    
    // Transform response to our format
    if (response.tickets) {
      variants.value = response.tickets.map((ticket: any) => {
        // Create picks string
        const picksString = matches.value
          .sort((a, b) => a.matchOrder - b.matchOrder)
          .map(match => {
            const pick = ticket.picks.find((p: any) => p.eventId === match.id)
            return pick?.outcome || '?'
          })
          .join('-')
        
        // Calculate average confidence
        const avgConfidence = ticket.picks.reduce((sum: any, p: any) => sum + (p.confidence || 0), 0) / ticket.picks.length
        
        return {
          ...ticket,
          picksString,
          avgConfidence,
          picks: ticket.picks.map((pick: any) => {
            const match = matches.value.find(m => m.id === pick.eventId)
            return {
              ...pick,
              matchId: pick.eventId,
              order: match?.matchOrder || 0,
              home: pick.home,
              away: pick.away
            }
          }).sort((a: any, b: any) => a.order - b.order)
        }
      })
    }
  } catch (e: any) {
    console.error('Error generating variants:', e)
    error.value = e.message || 'Hiba történt a variációk generálása közben'
  } finally {
    generatingVariants.value = false
  }
}

// Fetch data on mount
onMounted(() => {
  getCurrentWeekRound()
})

// Set page metadata
useHead({
  title: 'Variációk | Magyar Totó AI',
  meta: [
    {
      name: 'description',
      content: 'Tipposzlop variációk költségkeret alapján - Magyar Totó AI predikciók'
    }
  ]
})
</script>
