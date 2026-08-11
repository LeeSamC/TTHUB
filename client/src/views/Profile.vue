<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const user = ref(null);
const loading = ref(true);

onMounted(async () => {
    try{
        const res = await api.get('/profile')
        user.value = res.data;
    }catch (err) {
        router.push('/login')
    }finally {
        loading.value = false
    }
})

const logout = async () => {
  try{
    await api.post('/auth/logout')
  }finally{
    router.push('/login')
  }
    
};

</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white p-8">
    <div class="max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700">
      <div v-if="loading" class="text-center py-8">Loading profile...</div>

      <div v-else-if="user">
        <div class="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h1 class="text-2xl font-bold">User Profile</h1>
          <button @click="logout" class="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold transition">
            Logout
          </button>
        </div>

        <div class="space-y-3">
          <div><span class="text-slate-400">User ID:</span> <code class="text-xs bg-slate-900 p-1 rounded">{{ user.userId }}</code></div>
          <div><span class="text-slate-400">Name:</span> {{ user.firstName }} {{ user.lastName }}</div>
          <div><span class="text-slate-400">Username:</span> @{{ user.username }}</div>
          <div><span class="text-slate-400">Member Since:</span> {{ new Date(user.createdAt).toLocaleDateString() }}</div>
        </div>
      </div>
    </div>
  </div>
</template>