<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <span class="text-2xl">⚽</span>
            <span class="text-xl font-bold text-gray-900">Magyar Totó AI</span>
          </NuxtLink>
          <div class="flex space-x-4">
            <NuxtLink
              to="/"
              class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Főoldal
            </NuxtLink>
            <NuxtLink
              to="/variants"
              class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Variációk
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
        <div class="text-center">
          <p class="text-sm text-gray-600 mb-2">
            <strong>Magyar Totó AI</strong> - Heti predikciók és tipposzlop generátor
          </p>
          <p class="text-xs text-gray-500">
            ⚠️ Ez az alkalmazás szórakoztató és elemző célokra készült. 
            Nem garantál nyereséget. 18+ Felelősséggel játssz!
          </p>
          <div class="mt-3 text-xs text-gray-400">
            <a href="https://szamitogepes-jatekfuggoseg.hu" target="_blank" rel="noopener" class="hover:text-blue-600">
              Játékfüggőség segélyvonal
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
