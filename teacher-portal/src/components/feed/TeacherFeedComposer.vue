<script setup lang="ts">
import {computed, ref} from 'vue';
import {createTeacherPost} from '../../services/feed.service';

const message = ref('');
const busy = ref(false);
const status = ref('');
const error = ref('');
const canSubmit = computed(() => message.value.trim().length > 0 && !busy.value);

async function submit() {
  if (!canSubmit.value) return;
  busy.value = true;
  status.value = '';
  error.value = '';
  try {
    await createTeacherPost(message.value);
    message.value = '';
    status.value = 'Your update was shared with the school.';
  } catch (value) {
    error.value = value instanceof Error ? value.message : 'Could not share your update.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="feed-composer teacher-feed-composer">
    <span class="feed-composer-icon material-symbols-outlined" aria-hidden="true">edit_square</span>
    <div class="feed-composer-heading"><strong>Share with the school</strong><small>Post an update for all teachers and students.</small></div>
    <form @submit.prevent="submit">
      <label for="teacher-feed-message">Message</label>
      <textarea id="teacher-feed-message" v-model="message" maxlength="1000" rows="4" placeholder="Share an update with the school" :disabled="busy"></textarea>
      <div class="teacher-feed-composer-footer"><small>{{ message.length }}/1,000</small><button type="submit" class="primary" :disabled="!canSubmit">{{ busy ? 'Posting…' : 'Post update' }}</button></div>
    </form>
    <p v-if="status" class="feed-composer-status success" role="status">{{ status }}</p>
    <p v-if="error" class="feed-composer-status error" role="alert">{{ error }}</p>
  </section>
</template>
