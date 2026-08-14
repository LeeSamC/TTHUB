<script setup>
import { ref, onMounted } from 'vue';
import api from '../api/api';


const posts = ref([])
const loading = ref(true)
const errorMessage = ref('')

const isAuthenticated = ref(false)

const loadPosts = async () => {
  try{
    const res = await api.get('/posts')
    posts.value = res.data.posts || []
  }catch (error) {
    console.error(error)
    errorMessage.value = error.response?.data?.error || 'Failed to fetch post'
  }
}

const checkAuthentication = async () => {
  try{
    await api.get('/profile')
    isAuthenticated.value = true
  }catch {
    isAuthenticated.value = false
  }
}

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  try{
    await loadPosts()
    await checkAuthentication()

  }finally {
    loading.value = false
  }
  
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-sm">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold" >Welcome to TTHUB</h1>

      <router-link 
      v-if="isAuthenticated"
        to="/create-post"
        class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition"
      >+ Create Post</router-link>
    </div>

    <div v-if="loading" class="text-gray-500">Loading post....</div>
    

    <div v-else-if="posts.length > 0 ">
      <div v-for="post in posts" :key = "post.postId" class="border-b border-gray-200 py-4 last:border-0">
        <p class="text-gray-800">{{ post.content }}</p>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>By: {{ post.username || 'Unknown' }}</span>
          <span>•</span>
          <span>{{ new Date(post.createdAt).toLocaleDateString() }}</span>
        </div>
      </div>
    </div>
    <p v-else-if="errorMessage" class="text-red-500">{{ errorMessage }}</p>
    <p v-else class="text-grey-500">No posts yet</p>
    
    

  </div>
</template>