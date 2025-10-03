<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Tippszelvények</h1>
      <p class="text-gray-600">
        Generált variációk és tippkombinációk költségkeret alapján
      </p>
    </div>

    <DisclaimerBanner />

    <!-- Ticket Builder -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Szelvény Generátor</h2>

      <!-- Event Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-3">1. Válassz eseményeket</h3>
        
        <div v-if="loadingEvents" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Események betöltése...</p>
        </div>

        <div v-else-if="availableEvents.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-yellow-800">
            Nincsenek elérhető események predikcióval. Kérlek generálj először predikciókat az eseményekhez!
          </p>
          <NuxtLink to="/" class="mt-2 inline-block text-blue-600 hover:text-blue-800">
            → Események megtekintése
          </NuxtLink>
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <label
            v-for="event in availableEvents"
            :key="event.id"
            class="flex items-start p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
            :class="{ 'bg-blue-50 border-blue-400': selectedEventIds.includes(event.id) }"
          >
            <input
              type="checkbox"
              :value="event.id"
              v-model="selectedEventIds"
              class="mt-1 mr-3"
            />
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ event.home }} vs {{ event.away }}</p>
              <p class="text-sm text-gray-600">{{ event.league }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                  Predikció: {{ event.prediction?.outcome }}
                </span>
                <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  {{ (event.prediction?.confidence * 100).toFixed(0) }}% konfidencia
                </span>
              </div>
            </div>
          </label>
        </div>

        <p class="text-sm text-gray-500 mt-2">
          {{ selectedEventIds.length }} esemény kiválasztva
        </p>
      </div>

      <!-- Budget and Strategy -->
      <div class="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            2. Költségkeret (HUF)
          </label>
          <input
            v-model.number="budget"
            type="number"
            min="100"
            step="100"
            placeholder="pl. 5000"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            3. Stratégia
          </label>
          <select
            v-model="strategy"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="single">Single - 1 szelvény (legbiztosabb)</option>
            <option value="cover-2">Cover-2 - Fedezet legbiztosabb meccsen</option>
            <option value="cover-uncertain">Cover-uncertain - Fedezet bizonytalan meccseken</option>
            <option value="budget-optimized">Budget-optimized - Optimális fedezet</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">{{ strategyDescription }}</p>
        </div>
      </div>

      <!-- Generate Button -->
      <button
        @click="generateVariants"
        :disabled="selectedEventIds.length === 0 || budget <= 0 || generatingVariants"
        class="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="generatingVariants">Generálás...</span>
        <span v-else>Variációk Generálása</span>
      </button>

      <div v-if="variantsError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ variantsError }}</p>
      </div>
    </div>

    <!-- Generated Variants -->
    <div v-if="generatedVariants" class="space-y-6">
      <!-- Summary Panel -->
      <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-xl font-semibold">Összefoglaló</h2>
          <div class="flex gap-2">
            <a
              :href="`/api/export/csv?type=predictions&event_ids=${selectedEventIds.join(',')}`"
              target="_blank"
              class="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📄</span>
              CSV Export
            </a>
            <a
              :href="`/api/export/json?type=predictions&event_ids=${selectedEventIds.join(',')}`"
              target="_blank"
              class="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>📦</span>
              JSON Export
            </a>
          </div>
        </div>
        <div class="grid md:grid-cols-4 gap-4">
          <div>
            <p class="text-sm text-gray-600">Összes szelvény</p>
            <p class="text-2xl font-bold text-purple-700">{{ generatedVariants.tickets.length }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Összköltség</p>
            <p class="text-2xl font-bold text-blue-700">{{ generatedVariants.totalCost.toLocaleString('hu-HU') }} Ft</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Fedezettség</p>
            <p class="text-2xl font-bold text-green-700">{{ generatedVariants.coverage.coveragePercent.toFixed(1) }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Stratégia</p>
            <p class="text-lg font-bold text-gray-700">{{ generatedVariants.strategy }}</p>
          </div>
        </div>
      </div>

      <!-- Variants List -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Generált Szelvények</h2>
        
        <div
          v-for="(ticket, idx) in generatedVariants.tickets"
          :key="ticket.id"
          class="bg-white rounded-lg shadow-md p-6 border-l-4"
          :class="getTicketBorderClass(ticket)"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold">Szelvény #{{ idx + 1 }}</h3>
            <div class="text-right">
              <p class="text-sm text-gray-600">Tét</p>
              <p class="text-xl font-bold text-blue-700">{{ ticket.stake.toLocaleString('hu-HU') }} Ft</p>
            </div>
          </div>

          <!-- Picks -->
          <div class="space-y-2 mb-4">
            <div
              v-for="pick in ticket.picks"
              :key="pick.eventId"
              class="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <div>
                <p class="font-medium text-sm">{{ pick.home }} vs {{ pick.away }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                    {{ pick.outcome }}
                  </span>
                  <span class="text-xs text-gray-600">
                    {{ (pick.confidence * 100).toFixed(0) }}% konfidencia
                  </span>
                </div>
              </div>
              <p class="font-bold text-lg">{{ pick.odds.toFixed(2) }}</p>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p class="text-xs text-gray-600">Összes szorzó</p>
              <p class="font-bold text-green-700">{{ ticket.totalOdds.toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Várható nyeremény</p>
              <p class="font-bold text-blue-700">{{ ticket.expectedReturn.toLocaleString('hu-HU') }} Ft</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Expected Value</p>
              <p class="font-bold" :class="ticket.expectedValue >= 0 ? 'text-green-700' : 'text-red-700'">
                {{ ticket.expectedValue >= 0 ? '+' : '' }}{{ ticket.expectedValue.toFixed(0) }} Ft
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getAllEvents } = useEvents()

const loadingEvents = ref(true)
const availableEvents = ref<any[]>([])
const selectedEventIds = ref<string[]>([])
const budget = ref(5000)
const strategy = ref<'single' | 'cover-2' | 'cover-uncertain' | 'budget-optimized'>('budget-optimized')
const generatingVariants = ref(false)
const variantsError = ref<string | null>(null)
const generatedVariants = ref<any>(null)

const strategyDescription = computed(() => {
  switch (strategy.value) {
    case 'single':
      return '1 szelvény a legvalószínűbb kimenetelekkel'
    case 'cover-2':
      return 'Fedezet a 2 legvalószínűbb kimenetelyel a legbiztosabb meccsen'
    case 'cover-uncertain':
      return 'Fedezet a bizonytalan meccsek különböző kimeneteleivel'
    case 'budget-optimized':
      return 'Optimális fedezet a költségkeret alapján'
    default:
      return ''
  }
})

function getTicketBorderClass(ticket: any): string {
  const avgConfidence = ticket.picks.reduce((sum: number, p: any) => sum + p.confidence, 0) / ticket.picks.length
  
  if (avgConfidence >= 0.8) {
    return 'border-green-500'
  } else if (avgConfidence >= 0.6) {
    return 'border-yellow-500'
  } else {
    return 'border-orange-500'
  }
}

async function loadEvents() {
  loadingEvents.value = true
  try {
    const events = await getAllEvents()
    
    // Fetch predictions for all events
    const eventsWithPredictions = await Promise.all(
      events.map(async (event) => {
        try {
          const predData = await $fetch('/api/predict', {
            method: 'POST',
            body: { event_id: event.id, force_refresh: false }
          })
          return {
            ...event,
            prediction: predData.prediction
          }
        } catch {
          return null
        }
      })
    )
    
    // Filter out events without predictions
    availableEvents.value = eventsWithPredictions.filter(e => e !== null && e.prediction)
    
  } catch (e) {
    console.error('Error loading events:', e)
  } finally {
    loadingEvents.value = false
  }
}

async function generateVariants() {
  if (selectedEventIds.value.length === 0 || budget.value <= 0) return
  
  generatingVariants.value = true
  variantsError.value = null
  
  try {
    const result = await $fetch('/api/variants', {
      method: 'POST',
      body: {
        event_ids: selectedEventIds.value,
        budget_huf: budget.value,
        strategy: strategy.value,
        max_variants: 10
      }
    })
    
    generatedVariants.value = result
  } catch (e: any) {
    console.error('Error generating variants:', e)
    variantsError.value = e.data?.message || e.message || 'Hiba történt a variációk generálása közben'
  } finally {
    generatingVariants.value = false
  }
}

onMounted(() => {
  loadEvents()
})

useHead({
  title: 'Szelvények - TipMix AI',
  meta: [
    {
      name: 'description',
      content: 'Tippszelvények és variációk kezelése költségkeret alapján'
    }
  ]
})
</script>
