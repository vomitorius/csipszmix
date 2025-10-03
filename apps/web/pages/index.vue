<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Tippmix Események</h1>
      <p class="text-gray-600">
        AI-alapú mérkőzés előrejelzés és tippszorzó rendszer
      </p>
    </div>

    <DisclaimerBanner />

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Események betöltése...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <div v-else-if="events.length === 0" class="text-center py-12">
      <p class="text-gray-600">Nincsenek elérhető események.</p>
    </div>

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <EventCard v-for="event in events" :key="event.id" :event="event" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { events, loading, error, fetchEvents } = useEvents()

// Fetch events on mount
onMounted(() => {
  fetchEvents()
})

// Set page metadata
useHead({
  title: 'TipMix AI - Futball mérkőzés előrejelző',
  meta: [
    {
      name: 'description',
      content: 'AI-alapú futball mérkőzés előrejelző és tippszorzó rendszer Tippmix eseményekhez'
    }
  ]
})
</script>
