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

      <PredictionView :prediction="undefined" />

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800">
          <strong>Megjegyzés:</strong> Az AI predikciók és forrásgyűjtés funkciók a következő fejlesztési iterációban lesznek elérhetőek (M2, M3).
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { getEventById } = useEvents()

const event = ref()
const loading = ref(true)
const error = ref<string | null>(null)

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

onMounted(async () => {
  const id = route.params.id as string
  try {
    event.value = await getEventById(id)
    if (!event.value) {
      error.value = 'Az esemény nem található'
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
