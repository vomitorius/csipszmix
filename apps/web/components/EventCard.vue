<template>
  <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div class="flex-1">
        <p class="text-sm text-gray-500 mb-2">{{ event.league }}</p>
        <div class="space-y-1">
          <p class="font-semibold text-lg">{{ event.home }}</p>
          <p class="text-gray-400 text-sm">vs</p>
          <p class="font-semibold text-lg">{{ event.away }}</p>
        </div>
      </div>
      <div class="text-right">
        <span
          :class="[
            'inline-block px-3 py-1 rounded-full text-xs font-medium',
            statusClass
          ]"
        >
          {{ statusText }}
        </span>
        <p class="text-sm text-gray-600 mt-2">{{ formattedDate }}</p>
      </div>
    </div>

    <OddsDisplay :odds="event.odds" />

    <NuxtLink
      :to="`/events/${event.id}`"
      class="mt-4 block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Részletek
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { TippmixEvent } from '~/server/utils/types'

const props = defineProps<{
  event: TippmixEvent
}>()

const statusClass = computed(() => {
  switch (props.event.status) {
    case 'live':
      return 'bg-red-100 text-red-800'
    case 'finished':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-green-100 text-green-800'
  }
})

const statusText = computed(() => {
  switch (props.event.status) {
    case 'live':
      return 'Élő'
    case 'finished':
      return 'Befejezett'
    default:
      return 'Közelgő'
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.event.startTime)
  return date.toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})
</script>
