<template>
  <section
    class="rounded-2xl border p-4 sm:p-5"
    :class="[tone.border, tone.soft]"
    aria-live="polite"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <span class="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl" :class="tone.solid">
          <AppIcon :name="partIcon(partId)" class="w-5 h-5" />
        </span>
        <h3 class="text-base font-bold">{{ part.title }}</h3>
      </div>
      <p
        class="font-mono text-lg font-extrabold px-3 py-1 rounded-xl bg-white dark:bg-gray-900 border"
        :class="ready ? [tone.text, tone.border] : 'text-red-500 border-red-200 dark:border-red-900'"
      >{{ part.headline }}</p>
    </div>

    <!-- Prerequisites first: nothing is computed from blanks. -->
    <div
      v-if="!ready"
      class="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4 mb-5"
    >
      <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">Fill these in first</p>
      <ul class="space-y-3">
        <li v-for="req in part.requires" :key="req.label" class="text-sm">
          <p class="flex flex-wrap gap-2" :class="req.met ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'">
            <span v-if="req.met" aria-hidden="true" class="text-emerald-500">✓</span>
            <span v-else aria-hidden="true" class="mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>{{ req.label }}<span class="sr-only">{{ req.met ? ' (done)' : ' (needed)' }}</span></span>
            <button
              v-if="!req.met && req.part"
              type="button"
              class="ml-auto text-amber-700 dark:text-amber-400 font-semibold hover:underline"
              @click="emit('select', req.part)"
            >
              Go to {{ partLabel(diagram, req.part) }} →
            </button>
          </p>
          <div v-if="!req.met && req.fields" class="mt-2 grid sm:grid-cols-2 gap-4">
            <PartField v-for="field in req.fields" :key="field" :field="field" />
          </div>
        </li>
      </ul>
    </div>

    <template v-else>
      <ol class="space-y-2 mb-5">
        <li
          v-for="(step, index) in part.steps"
          :key="step.label"
          class="flex gap-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-3"
        >
          <span
            class="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums"
            :class="tone.badge"
          >{{ index + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ step.label }}</p>
            <p class="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span class="font-mono text-xs text-gray-500 dark:text-gray-400 break-words">{{ step.formula }}</span>
              <span class="font-mono text-sm font-bold whitespace-nowrap" :class="tone.text">= {{ step.result }}</span>
            </p>
          </div>
        </li>
      </ol>

      <ul v-if="part.notes.length" class="mb-5 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 list-disc pl-4 marker:text-gray-400">
        <li v-for="note in part.notes" :key="note">{{ note }}</li>
      </ul>
    </template>

    <details v-if="editableInputs.length" :open="ready" class="mb-4 rounded-xl bg-white/70 dark:bg-gray-900/60 p-3">
      <summary class="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 select-none">
        Inputs for this part
        <span class="font-normal text-gray-400">— changes apply to the whole calculator</span>
      </summary>
      <div class="mt-3 grid sm:grid-cols-2 gap-4">
        <PartField v-for="field in editableInputs" :key="field" :field="field" />
      </div>
    </details>

    <div v-if="relatedParts.length" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="text-gray-500 dark:text-gray-400">Related:</span>
      <button
        v-for="id in relatedParts"
        :key="id"
        type="button"
        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        :class="partTone(diagram, id).hover"
        @click="emit('select', id)"
      >
        <span class="w-2 h-2 rounded-full" :class="partTone(diagram, id).dot" />
        {{ partLabel(diagram, id) }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The selected part's details: what to fill in first, or the worked steps behind its
 * size, plus its inputs and links to related parts.
 */
import { computed } from 'vue'
import { AppIcon } from '../ui'
import { PartField } from '../inputs'
import { partIcon, partLabel, partTone } from './labels'
import { isReady, type PartDetail, type PartId, type SystemDiagram } from '../../lib/diagram'

const props = defineProps<{
  diagram: SystemDiagram
  partId: PartId
  part: PartDetail
}>()

const emit = defineEmits<{ select: [id: PartId] }>()

const tone = computed(() => partTone(props.diagram, props.partId))
const ready = computed(() => isReady(props.part))

/** Inputs not already asked for in the "fill these in first" box. */
const editableInputs = computed(() => {
  const asked = new Set(ready.value ? [] : props.part.requires.filter(r => !r.met).flatMap(r => r.fields ?? []))
  return props.part.inputs.filter(f => !asked.has(f))
})

const relatedParts = computed(() => props.part.related.filter(id => props.diagram.parts[id]))
</script>
