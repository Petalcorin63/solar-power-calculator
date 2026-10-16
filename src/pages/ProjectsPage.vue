<template>
  <ProjectsPanel :workspace="workspace" />
</template>

<script setup lang="ts">
/** My projects tab (signed in only): save, open, rename and delete saved projects. */
import { ProjectsPanel } from '../components/account'
import type { Workspace } from '../composables/workspace'

defineProps<{ workspace: Workspace }>()
</script>
