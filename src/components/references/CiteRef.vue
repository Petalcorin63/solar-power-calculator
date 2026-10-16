<template>
  <sup class="ml-0.5">
    <a
      :href="`#ref-${id}`"
      class="text-amber-600 dark:text-amber-400 hover:underline"
      :aria-label="`Reference ${n}`"
    >[{{ n }}]</a>
  </sup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { citationNumber } from '../../lib/references'

const props = defineProps<{ id: string }>()
const n = computed(() => citationNumber(props.id))
</script>
