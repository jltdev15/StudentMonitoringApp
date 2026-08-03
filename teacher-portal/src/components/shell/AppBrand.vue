<script setup lang="ts">
import classTrackSymbol from '../../assets/class-track-symbol.png';

withDefaults(defineProps<{label?: string; decorative?: boolean}>(), {
  label: 'PORTAL',
  decorative: false,
});
</script>

<template>
  <div class="brand">
    <div class="brand-mark"><img :src="classTrackSymbol" :alt="decorative ? '' : 'ClassTrack'" /></div>
    <span>{{ label }}</span>
  </div>
</template>
