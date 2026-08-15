<script setup>
import { ref, onMounted, reactive } from 'vue';
import api from '../api/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const posts = ref([])
const loading = ref(true)
const errorMessage = ref('')

const isCreatingPost = ref(false)
const isEditingPost = ref(false)

const content = ref('')
const editContent = ref('')

const editingPostId = ref('')


const showModal = ref(false)

const openModal = () => {
  content.value = ''
  errorMessage.value = ''
  showModal.value = true
}

const closeModal = () => {
    if (isCreatingPost.value) return
    content.value = ''
    errorMessage.value = ''
    showModal.value = false
}



const handlePostContent = async () => {
  errorMessage.value = ''

  if(!authStore.isAuthenticated) {
    errorMessage.value = 'Must be logged in'
    return
  }

  if(!content.value.trim()) {
    errorMessage.value = 'Post content cannot be empty'
    return
  }

  isCreatingPost.value = true

  try{
    const res = await api.post('/posts', {
      content: content.value.trim()
    })

    console.log('Post created:', res.data)

    //Reload Post
    await loadPosts()

    showModal.value = false
    content.value = ''
  }catch (err) {
    console.log('Post error: ',err)

    errorMessage.value = err.response?.data?.error || 'Failed to create post'
  }finally {
    isCreatingPost.value = false
  }
}

const startEditing = (post) => {
  editingPostId.value = post.postId
  editContent.value = post.content
  errorMessage.value = ''
}

const cancelEdit = () => {
  editingPostId.value = null
  editContent.value = null
  errorMessage.value = null
}

const handleEditContent = async () => {
  errorMessage.value = ''

  if(!editingPostId.value) {
    return
  }
  if(!editContent.value.trim()){
    errorMessage.value = 'Content cannot be empty'
    return
  }

  isEditingPost.value = true

  try{
    const res = await api.patch(`/posts/${editingPostId.value}`, {
      content: editContent.value.trim()
    })

    console.log('Post edited', res.data)

    await loadPosts()

    cancelEdit()


  }catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to edit content'
  }finally {
      isEditingPost.value = false
  }
}

const handleDeletePost = async (post) => {
  errorMessage.value = ''

  try{
    await api.delete(`/posts/${post.postId}`)
    await loadPosts()
  }catch (err){
    errorMessage.value = err.response?.data?.error || 'Failed to delete post'
  }
}


const loadPosts = async () => {

  loading.value = true
  errorMessage.value = ''

  try{
    const res = await api.get('/posts')
    posts.value = res.data.posts || []
  }catch (error) {
    console.error(error)
    errorMessage.value = error.response?.data?.error || 'Failed to fetch post'
  }finally{
    loading.value = false
  }
}


onMounted(async () => {
  loadPosts()
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-sm">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold" >Welcome to TTHUB</h1>

      <button 
      v-if="authStore.isAuthenticated"
        type="button"
        @click="openModal"
        class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition"
      >+ Create Post</button>
    </div>

    <teleport to='body'>
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="closeModal">
        <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
          <div class="flex items-center gap-3">
            <div>
              <h3  class="text-lg font-bold text-slate-900"> TTHUB</h3>
            </div>
          </div>
          <div v-if="errorMessage" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">
            {{ errorMessage }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Create a Post</label>
            <input v-model="content" type="text" placeholder="I like cheese" @keyup.enter="handlePostContent" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" :disabled="isCreatingPost" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition">
              Cancel
            </button>

            <button type="button" @click="handlePostContent" :disabled="!content || isCreatingPost" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition flex items-center gap-2">
              {{ isCreatingPost ? 'Posting...' : 'Post' }}
            </button>
          </div>

        </div>
      </div>
    </teleport>

    <div v-if="loading" class="text-gray-500">Loading post....</div>
    

    <div v-else-if="posts.length > 0 ">
      <div v-for="post in posts" :key = "post.postId" class="border-b border-gray-200 py-4 last:border-0">

        <div v-if="editingPostId === post.postId">
          <input v-model="editContent" type="text" class="w-full border border-slate-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" @keyup.enter="handleEditContent">

          <div class="flex gap-2 mt-2">
            <button type="button" @click="handleEditContent" :disabled="isEditingPost || !editContent.trim()" class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded-md text-sm">
              {{ isEditingPost ? 'Saving...' : 'Save' }}
            </button>

            <button type="button" @click="cancelEdit" :disabled="isEditingPost" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-sm">
              Cancel
            </button>
          </div>
        </div>

        <div v-else>
          <p class="text-gray-800">{{ post.content }}</p>

          <div v-if="authStore.isAuthenticated && authStore.user?.userId === post.userId" class=" flex gap-4 mt-0.5">
            <button type="button" @click="startEditing(post)" class="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
              Edit
            </button>
            <button type="button" @click="handleDeletePost(post)" class="text-indigo-600 hover:text-red-800 text-xs font-medium" >
              Delete
            </button>

          </div>
        </div>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>By : {{ post.username || 'Unknown' }}</span>
          <span>•</span>
          <span>{{ new Date(post.createdAt).toLocaleDateString() }}</span>
        </div>
      </div>
    </div>
    <p v-else-if="errorMessage" class="text-red-500">{{ errorMessage }}</p>
    <p v-else class="text-grey-500">No posts yet</p>
    
    

  </div>
</template>