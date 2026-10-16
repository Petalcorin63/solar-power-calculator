<template>
  <!-- Sunrise gradient so the page opens with some color. Compact, so the tabs stay near the top. -->
  <header class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-amber-500 text-white px-6 py-7 sm:px-10 sm:py-9 shadow-lg shadow-indigo-200/60 dark:shadow-none">
    <div class="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-amber-300/40 blur-2xl" aria-hidden="true" />
    <AppIcon name="sun" class="hidden sm:block absolute right-6 top-6 w-14 h-14 text-amber-200/80" />
    <p class="relative text-xs font-semibold uppercase tracking-widest text-amber-200 mb-2">
      Solar sizing
    </p>
    <h1 class="relative text-3xl sm:text-4xl font-extrabold mb-3 max-w-md">Solar Power System Calculator</h1>
    <p class="relative text-sky-50/90 max-w-lg text-sm sm:text-base">
      List what you need to power, and get a starting-point size for your solar
      panels, batteries, inverter, wires and breakers — with every calculation shown.
    </p>
  </header>
</template>

<script setup lang="ts">
/** The page title banner. */
import { AppIcon } from '../ui'
</script>
