<template>
  <div class="mt-8 flex justify-end">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-200/60 dark:shadow-none transition-colors"
      @click="emit('click')"
    >
      {{ label }} <span aria-hidden="true">→</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/** The "continue to the next tab" button at the bottom of a page. */
defineProps<{ label: string }>()
const emit = defineEmits<{ click: [] }>()
</script>
