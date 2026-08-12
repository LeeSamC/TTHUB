<!-- src/views/Home.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const user = ref(null);

onMounted(async () => {
  const res = await api.get('/profile');
  user.value = res.data;
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-sm">
    <h1 class="text-2xl font-bold">Welcome Home!</h1>
    <p v-if="user">Logged in as: {{ user.username }}</p>
  </div>
</template>