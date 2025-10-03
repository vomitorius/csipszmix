<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <span class="text-2xl">⚽</span>
            <span class="text-xl font-bold text-gray-900">TipMix AI</span>
          </NuxtLink>
          <div class="flex space-x-4">
            <NuxtLink
              to="/"
              class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Események
            </NuxtLink>
            <NuxtLink
              to="/tickets"
              class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Szelvények
            </NuxtLink>
            <NuxtLink
              to="/admin/crawl"
              class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Admin
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </main>

    <footer class="bg-white border-t mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-center text-sm text-gray-500">
          ⚠️ <strong>Figyelem:</strong> Ez az alkalmazás szórakoztató és elemző célokra készült. 
          Nem garantál nyereséget, és nem helyettesíti a szakmai tanácsadást.
        </p>
      </div>
    </footer>
  </div>
</template>
