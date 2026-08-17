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

const selectedFile = ref(null)
const imagePreview = ref('')
const isUploadingMedia = ref(false)

const editSelectedFile = ref(null)
const editImagePreview = ref('')


const showModal = ref(false)

const openModal = () => {
  content.value = ''
  errorMessage.value = ''
  removeSelectedFile()
  showModal.value = true
}

const closeModal = () => {
    if (isCreatingPost.value) return
    content.value = ''
    errorMessage.value = ''
    removeSelectedFile()
    showModal.value = false
}



const handlePostContent = async () => {
  errorMessage.value = ''

  if(!authStore.isAuthenticated) {
    errorMessage.value = 'Must be logged in'
    return
  }

  if(!content.value.trim() && !selectedFile.value) {
    errorMessage.value = 'Post content cannot be empty'
    return
  }

  isCreatingPost.value = true

  try{
    let mediaIds = []

    if(selectedFile.value) {
      isUploadingMedia.value = true

      const formData = new FormData()

      formData.append('file', selectedFile.value)

      const mediaResponse = await api.post('/media',  formData)

      const uploadMedia = mediaResponse.data.media

      mediaIds.push(uploadMedia.mediaId)

      isUploadingMedia.value = false
    }


    const res = await api.post('/posts', {
      content: content.value.trim(),
      mediaIds: mediaIds
    })

    console.log('Post created:', res.data)

    //Reload Post
    await loadPosts()

    removeSelectedFile()

    showModal.value = false
    content.value = ''
  }catch (err) {
    console.log('Post error: ',err)

    errorMessage.value = err.response?.data?.error || 'Failed to create post'
  }finally {
    isCreatingPost.value = false
    isUploadingMedia.value = false
  }
}

const startEditing = (post) => {
  editingPostId.value = post.postId
  editContent.value = post.content

  editSelectedFile.value = null
  editImagePreview.value = ''

  errorMessage.value = ''
}

const cancelEdit = () => {
  if(editImagePreview.value) {
    URL.revokeObjectURL(editImagePreview.value)
  }
  editingPostId.value = null
  editContent.value = null
  editSelectedFile.value = null
  editImagePreview.value = ''
  errorMessage.value = ''
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

  const formData = new FormData()

  formData.append('content', editContent.value.trim())

  if(editSelectedFile.value) {
    formData.append('file', editSelectedFile.value)
  }

  isEditingPost.value = true

  try{
    const res = await api.patch(`/posts/${editingPostId.value}`, formData)

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

const handleFileSelect = (event) => {
  const file = event.target.files[0]

  if(!file) {
    return 
  }

  if(!file.type.startsWith('image/')) {
    errorMessage.value = 'Please select an image file'
    event.target.value = ''
    return
  }

  if(file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'Please select an image file'
    event.target.value = ''
    return 
  }

  selectedFile.value = file

  imagePreview.value = URL.createObjectURL(file)

  errorMessage.value = ''
    
}

const removeSelectedFile = () => {
  if(imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }

  selectedFile.value = null
  imagePreview.value = ''
}

const handleEditFileSelect = (event) => {
  const file = event.target.files[0]

  if(!file) return

  if (!file.type.startsWith('image/')) {
        errorMessage.value = 'Please select an image file'
        return
    }

  if (file.size > 10 * 1024 * 1024) {
        errorMessage.value = 'Image must be less than 10MB'
        return
    }



  editSelectedFile.value = file

  if(editImagePreview.value) {
    URL.revokeObjectURL(editImagePreview.value)
  }

  editImagePreview.value = URL.createObjectURL(file)
}

const removeEditSelectedFile = () => {
  if(editImagePreview.value) {
    URL.revokeObjectURL(editImagePreview.value)
  }
  editSelectedFile.value = null
  editImagePreview.value = ''
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
            <textarea v-model="content" placeholder="Whats Happening" rows="3" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"></textarea>
            <div class="flex items-center justify-between">
              <label class="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition">
                Add Image
                <input type="file" accept="image/jpeg, image/png, image/webp, image/gif" class="hidden" @change="handleFileSelect">
              </label>
              <span v-if="selectedFile" class="text-xs text-gray-500">{{ selectedFile.name }}</span>
            </div>
            <div v-if="imagePreview" class="relative mt-3">
              <img :src="imagePreview" alt="Selected image preview" class="w-full max-h-80 object-cover rounded-lg border border-slate-200">
              <button type="button" @click="removeSelectedFile" class="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition">x</button>
            </div>

          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" :disabled="isCreatingPost" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition">
              Cancel
            </button>

            <button type="button" @click="handlePostContent" :disabled="(!content.trim() && !selectedFile) || isCreatingPost" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition flex items-center gap-2">
              {{ isUploadingMedia ? 'Uploading...' : isCreatingPost ? 'Posting... ' : 'Post' }}
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
          <div class="mt-3">
            <label class="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm">
              Change Image

              <input 
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                @change="handleEditFileSelect"
              >
            </label>
          </div>

          <div v-if="editImagePreview" class="relative mt-3">
            <img :src="editImagePreview" alt="New Image preview" class="w-full max-h-80 object-cover rounded-lg border border-slate-200">

            <button type="button" @click="removeEditSelectedFile" class="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black">
              x
            </button>
          </div>
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

          <div v-if="post.media && post.media.length > 0" class="mt-3 space-y-3">
            <div v-for="item in post.media" :key="item.mediaId">
              <img 
              v-if="item.type === 'image'" 
              :src="`http://localhost:3000/uploads/${item.storageKey}`" 
              :alt="`Image uploaded by ${post.username || 'user'}`" 
              class="w-full max-h-125 object-cover rounded-lg border border-slate-200"/>

            </div>

          </div>

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