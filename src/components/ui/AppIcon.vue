<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </template>
    <template v-else-if="name === 'panel'">
      <path d="M5 4h14l2 11H3z" />
      <path d="M4 9.5h16M9.7 4l-.7 11M14.3 4l.7 11M12 15v5M8 20h8" />
    </template>
    <template v-else-if="name === 'controller'">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 14a4 4 0 0 1 8 0" />
      <path d="M12 14l2-2.5M8 18h8" />
    </template>
    <template v-else-if="name === 'battery'">
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2M6 12h3M7.5 10.5v3M12.5 12h3" />
    </template>
    <template v-else-if="name === 'inverter'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 9h4M7 15c1-2 2-2 3 0s2 2 3 0 2-2 3 0M17 6l-3 6" />
    </template>
    <template v-else-if="name === 'home'">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M12.5 11l-2 3.5h3l-2 3.5" />
    </template>
    <template v-else-if="name === 'critical'">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M12.5 8l-2.5 4.5h4L11.5 17" />
    </template>
    <template v-else-if="name === 'grid'">
      <path d="M8 21L12 3l4 18M6 8h12M5 12h14M9.6 14h4.8M8.6 18h6.8" />
    </template>
    <template v-else-if="name === 'plug'">
      <path d="M9 2v5M15 2v5M6 7h12v3a6 6 0 0 1-12 0zM12 16v6" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
    </template>
    <template v-else-if="name === 'diagram'">
      <rect x="3" y="3" width="7" height="6" rx="1.5" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="3" width="7" height="6" rx="1.5" />
      <path d="M10 6h4M17.5 9v6M6.5 9v9H14" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" />
    </template>
    <template v-else-if="name === 'cable'">
      <path d="M4 20c0-5 4-5 8-8s8-3 8-8" />
      <circle cx="4" cy="20" r="1.5" />
      <circle cx="20" cy="4" r="1.5" />
    </template>
    <template v-else-if="name === 'breaker'">
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <rect x="9.5" y="6" width="5" height="8" rx="1" />
      <path d="M12 6v4M9 18h6" />
    </template>
    <template v-else-if="name === 'offgrid'">
      <circle cx="7" cy="7" r="3" />
      <path d="M7 1.5v1M1.5 7h1M3.1 3.1l.7.7" />
      <rect x="11" y="12" width="10" height="7" rx="1.5" />
      <path d="M21.5 14.5v2M14 15.5h4" />
    </template>
    <template v-else-if="name === 'gridtied'">
      <circle cx="7" cy="7" r="3" />
      <path d="M7 1.5v1M1.5 7h1M3.1 3.1l.7.7" />
      <path d="M14 22l3-12 3 12M13 14h8M14.5 18h5" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </template>
    <template v-else-if="name === 'hybrid'">
      <circle cx="6" cy="6" r="2.5" />
      <path d="M6 1.5v.8M1.5 6h.8" />
      <path d="M15 21l2.5-10 2.5 10M14 14h7" />
      <rect x="3" y="14" width="8" height="6" rx="1.2" />
      <path d="M11.5 16.2v1.6" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { IconName } from '../theme'

defineProps<{ name: IconName }>()
</script>
