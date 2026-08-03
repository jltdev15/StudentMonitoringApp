<script setup lang="ts">
import {computed, ref} from 'vue';
import type {StudentFeedPostPresetKey} from '../../types';
import {createStudentPost, STUDENT_FEED_POST_PRESETS} from '../../services/feed.service';

const selectedPreset = ref<StudentFeedPostPresetKey | ''>('');
const busy = ref(false);
const error = ref('');
const success = ref('');
const selectedMessage = computed(() => selectedPreset.value ? STUDENT_FEED_POST_PRESETS[selectedPreset.value] : '');

async function publish() {
  if (!selectedPreset.value || busy.value) return;
  busy.value = true;
  error.value = '';
  success.value = '';
  try {
    await createStudentPost(selectedPreset.value);
    selectedPreset.value = '';
    success.value = 'Your update was shared with the school community.';
  } catch (value) {
    const message = value instanceof Error ? value.message : '';
    error.value = /few minutes|resource-exhausted/i.test(message)
      ? 'Please wait a few minutes before sharing another update.'
      : 'Your update could not be shared. Please try again.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="feed-composer" aria-labelledby="feed-composer-title">
    <span class="feed-composer-icon material-symbols-outlined" aria-hidden="true">edit_square</span>
    <div class="feed-composer-heading">
      <strong id="feed-composer-title">Share with the school</strong>
      <small>Choose an approved positive message to post.</small>
    </div>
    <form @submit.prevent="publish">
      <label for="student-feed-preset">Message</label>
      <select id="student-feed-preset" v-model="selectedPreset" :disabled="busy" @change="error = ''; success = ''">
        <option value="" disabled>Choose a message</option>
        <option v-for="(message, key) in STUDENT_FEED_POST_PRESETS" :key="key" :value="key">{{ message }}</option>
      </select>
      <button type="submit" class="primary" :disabled="!selectedPreset || busy">{{ busy ? 'Posting…' : 'Post update' }}</button>
    </form>
    <p v-if="selectedMessage" class="feed-composer-preview"><span>Preview</span>{{ selectedMessage }}</p>
    <p v-if="success" class="feed-composer-status success" role="status">{{ success }}</p>
    <p v-if="error" class="feed-composer-status error" role="alert">{{ error }}</p>
  </section>
</template>
