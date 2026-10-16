<script setup lang="ts">
import type {NavigationGroup, NavigationItemId} from './navigation';

defineProps<{
  groups: readonly NavigationGroup[];
  activeId?: NavigationItemId;
  idPrefix: string;
}>();

defineEmits<{select: [id: NavigationItemId]}>();
</script>

<template>
  <nav class="grouped-navigation" aria-label="Primary navigation">
    <section
      v-for="group in groups"
      :key="group.id"
      class="nav-group"
      :aria-labelledby="`${idPrefix}-${group.id}`"
    >
      <h2 :id="`${idPrefix}-${group.id}`" class="nav-group-title">{{ group.label }}</h2>
      <div class="nav-group-items">
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          :class="{active: activeId === item.id}"
          :aria-current="activeId === item.id ? 'page' : undefined"
          @click="$emit('select', item.id)"
        >
          <i aria-hidden="true">{{ item.icon }}</i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </section>
  </nav>
</template>

<style scoped>
.grouped-navigation {
  display: grid;
  gap: 16px;
  flex-shrink: 0;
  margin-bottom: 24px;
}

.nav-group + .nav-group {
  padding-top: 16px;
  border-top: 1px solid #e6eaf1;
}

.nav-group-title {
  margin: 0 0 8px;
  padding: 0 12px 0 45px;
  color: #63728a;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .1em;
  line-height: 1.5;
  text-transform: uppercase;
}

.nav-group-items {
  display: grid;
  gap: 2px;
}

.nav-group-items button {
  width: 100%;
  min-height: 44px;
}

.nav-group-items button span {
  min-width: 0;
  padding-block: 10px;
  line-height: 1.4;
}

@media (max-width: 760px) {
  .nav-group-title { padding-left: 46px; }
}
</style>
