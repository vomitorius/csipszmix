<template>
  <div>
    <NuxtLink to="/" class="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
      <span class="mr-2">←</span>
      Vissza az eseményekhez
    </NuxtLink>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Esemény betöltése...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <div v-else-if="event" class="space-y-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-start mb-6">
          <div>
            <p class="text-sm text-gray-500 mb-2">{{ event.league }}</p>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              {{ event.home }} vs {{ event.away }}
            </h1>
            <p class="text-gray-600">{{ formattedDate }}</p>
          </div>
          <span
            :class="[
              'px-4 py-2 rounded-full text-sm font-medium',
              statusClass
            ]"
          >
            {{ statusText }}
          </span>
        </div>

        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3">Fogadási szorzók</h2>
          <OddsDisplay :odds="event.odds" />
        </div>

        <div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm text-gray-600">Esemény ID</p>
            <p class="font-semibold">{{ event.id }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Liga</p>
            <p class="font-semibold">{{ event.league }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Kezdés</p>
            <p class="font-semibold">{{ formattedDate }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Státusz</p>
            <p class="font-semibold">{{ statusText }}</p>
          </div>
        </div>
      </div>

      <!-- Sources & Facts Section -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Források és Tények</h2>
          <NuxtLink
            :to="`/admin/crawl`"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Admin Panel
          </NuxtLink>
        </div>

        <!-- Loading State -->
        <div v-if="loadingSources" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Források betöltése...</p>
        </div>

        <!-- Sources List -->
        <div v-else-if="sources.length > 0">
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">Források ({{ sources.length }})</h3>
            <div class="space-y-2">
              <div
                v-for="source in sources.slice(0, 5)"
                :key="source.id"
                class="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <a
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  {{ source.title || source.url }}
                </a>
                <div class="flex gap-2 mt-1">
                  <span class="text-xs text-gray-500">{{ source.language }}</span>
                  <span class="text-xs text-gray-400">•</span>
                  <span class="text-xs text-gray-500">{{ formatDate(source.created_at) }}</span>
                </div>
              </div>
            </div>
            <p v-if="sources.length > 5" class="text-sm text-gray-500 mt-3">
              ... és {{ sources.length - 5 }} további forrás
            </p>
          </div>

          <!-- Facts Display -->
          <div v-if="hasFacts" class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">Kinyert Tények</h3>

            <!-- Injuries -->
            <div v-if="facts.injuries?.length > 0" class="mb-4">
              <h4 class="font-semibold text-red-700 mb-2">🤕 Sérülések</h4>
              <div class="space-y-2">
                <div
                  v-for="fact in facts.injuries"
                  :key="fact.id"
                  class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm"
                >
                  <p class="font-medium text-red-900">{{ fact.entity }}</p>
                  <p class="text-red-800 mt-1">{{ fact.description }}</p>
                  <span class="inline-block mt-2 px-2 py-1 bg-red-200 text-red-800 text-xs rounded">
                    {{ Math.round(fact.confidence * 100) }}% konfidencia
                  </span>
                </div>
              </div>
            </div>

            <!-- Suspensions -->
            <div v-if="facts.suspensions?.length > 0" class="mb-4">
              <h4 class="font-semibold text-orange-700 mb-2">⛔ Eltiltások</h4>
              <div class="space-y-2">
                <div
                  v-for="fact in facts.suspensions"
                  :key="fact.id"
                  class="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm"
                >
                  <p class="font-medium text-orange-900">{{ fact.entity }}</p>
                  <p class="text-orange-800 mt-1">{{ fact.description }}</p>
                  <span class="inline-block mt-2 px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded">
                    {{ Math.round(fact.confidence * 100) }}% konfidencia
                  </span>
                </div>
              </div>
            </div>

            <!-- Form -->
            <div v-if="facts.form?.length > 0" class="mb-4">
              <h4 class="font-semibold text-blue-700 mb-2">📊 Forma</h4>
              <div class="space-y-2">
                <div
                  v-for="fact in facts.form"
                  :key="fact.id"
                  class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                >
                  <p class="font-medium text-blue-900">{{ fact.entity }}</p>
                  <p class="text-blue-800 mt-1">{{ fact.description }}</p>
                  <span class="inline-block mt-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                    {{ Math.round(fact.confidence * 100) }}% konfidencia
                  </span>
                </div>
              </div>
            </div>

            <!-- Tactical -->
            <div v-if="facts.tactical?.length > 0" class="mb-4">
              <h4 class="font-semibold text-gray-700 mb-2">⚙️ Taktikai Változások</h4>
              <div class="space-y-2">
                <div
                  v-for="fact in facts.tactical"
                  :key="fact.id"
                  class="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <p class="font-medium text-gray-900">{{ fact.entity }}</p>
                  <p class="text-gray-800 mt-1">{{ fact.description }}</p>
                  <span class="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                    {{ Math.round(fact.confidence * 100) }}% konfidencia
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <p class="text-gray-500 mb-4">Még nincsenek források ehhez az eseményhez</p>
          <NuxtLink
            :to="`/admin/crawl`"
            class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Indítsd el a crawl-t az Admin Panelben
          </NuxtLink>
        </div>
      </div>

      <PredictionView :prediction="undefined" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { getEventById } = useEvents()

const event = ref()
const loading = ref(true)
const error = ref<string | null>(null)
const sources = ref<any[]>([])
const facts = ref<any>({})
const loadingSources = ref(false)

const hasFacts = computed(() => {
  return Object.values(facts.value).some((arr: any) => arr && arr.length > 0)
})

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formattedDate = computed(() => {
  if (!event.value) return ''
  const date = new Date(event.value.startTime)
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const statusClass = computed(() => {
  if (!event.value) return ''
  switch (event.value.status) {
    case 'live':
      return 'bg-red-100 text-red-800'
    case 'finished':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-green-100 text-green-800'
  }
})

const statusText = computed(() => {
  if (!event.value) return ''
  switch (event.value.status) {
    case 'live':
      return 'Élő'
    case 'finished':
      return 'Befejezett'
    default:
      return 'Közelgő'
  }
})

async function loadSourcesAndFacts() {
  if (!event.value) return
  
  loadingSources.value = true
  try {
    const data = await $fetch(`/api/sources/${event.value.id}`)
    sources.value = data.sources || []
    facts.value = data.facts || {}
  } catch (e) {
    console.error('Error loading sources:', e)
    sources.value = []
    facts.value = {}
  } finally {
    loadingSources.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    event.value = await getEventById(id)
    if (!event.value) {
      error.value = 'Az esemény nem található'
    } else {
      // Load sources and facts
      await loadSourcesAndFacts()
    }
  } catch (e: any) {
    error.value = e.message || 'Hiba történt az esemény betöltése közben'
  } finally {
    loading.value = false
  }
})

useHead(() => ({
  title: event.value 
    ? `${event.value.home} vs ${event.value.away} - TipMix AI`
    : 'Esemény betöltése - TipMix AI'
}))
</script>
