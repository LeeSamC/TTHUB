<script setup>
import { ref, onMounted} from 'vue';
import api from '../api/api';
import { useAuthStore } from '../stores/auth';
import CommentSection from '../components/CommentSection.vue'

const authStore = useAuthStore();

const posts = ref([])

const currentPage = ref(1)
const pageSize = ref(10)

const totalPages= ref(1)
const hasNextPage = ref(false)
const hasPreviousPage = ref(false)



const loading = ref(true)
const likedPostId = ref('')

const errorMessage = ref('')

const isCreatingPost = ref(false)
const isEditingPost = ref(false)
const isUploadingMedia = ref(false)
const isReplacingMedia = ref(false)

const content = ref('')
const editContent = ref('')
const editingPostId = ref('')

const selectedFile = ref(null)
const mediaPreview = ref('')
const mediaPreviewType = ref('')


const editSelectedFile = ref(null)
const editMediaPreview = ref('')
const editMediaPreviewType = ref('')

const showModal = ref(false)

const MAX_FILE_SIZE = 100 * 1024 * 1024

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
]

const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES
]


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
      mediaIds
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
  editContent.value = post.content || ''

  removeEditSelectedFile()
  errorMessage.value = ''
}

const cancelEdit = () => {
  removeEditSelectedFile()

  editingPostId.value = null
  editContent.value = null
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

  isEditingPost.value = true

  try{
    const res = await api.patch(`/posts/${editingPostId.value}`, {content: editContent.value.trim()})

    console.log('Post edited', res.data)

    if(editSelectedFile.value) {
      isReplacingMedia.value = true

      const formData = new FormData()

      formData.append('file', editSelectedFile.value)

      await api.put(`/posts/${editingPostId.value}/media`, formData)

      isReplacingMedia.value = false
    }

    await loadPosts()

    cancelEdit()

  }catch (err) {
    console.error('Edit post error', err)

    errorMessage.value = err.response?.data?.error || 'Failed to edit content'
  }finally {
      isEditingPost.value = false
      isReplacingMedia.value = false
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


const loadPosts = async (page = currentPage.value) => {

  loading.value = true
  errorMessage.value = ''

  try{
    const res = await api.get('/posts', {
      params: {
        page,
        limit: pageSize.value
      }
    })
    posts.value = (res.data.posts || []).map(post => ({
      ...post,
      likeCount: post.likeCount || 0,
      likedByCurrentUser: post.likedByCurrentUser || false,
      commentCount: post.commentCount || 0,

      showComments: false
    }))

    currentPage.value = res.data.pagination.page
    totalPages.value = res.data.pagination.totalPages
    hasNextPage.value = res.data.pagination.hasNextPage
    hasPreviousPage.value = res.data.pagination.hasPreviousPage
  }catch (error) {
    console.error(error)
    errorMessage.value = error.response?.data?.error || 'Failed to fetch post'
  }finally{
    loading.value = false
  }
}


const validateMediaFile = (file) => {
  if(!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a JPG, PNG, WEBP, GIF, MP4, WEBM, OR MOV file'
    }
  }

  if(file.size > MAX_FILE_SIZE) {
    return{
      valid: false,
      error: 'Media file must be less that 100MB'
    }
  }

  return {
    valid: true,
    error: ''
  }
}


const handleFileSelect = (event) => {
  const file = event.target.files?.[0]

  if(!file) {
    return 
  }

  const validation = validateMediaFile(file)

  if(!validation.valid) {
    errorMessage.value = validation.error

    event.target.value = ''

    return

  }

  if(mediaPreview.value) {
    URL.revokeObjectURL(mediaPreview.value)
  }

  selectedFile.value = file

  mediaPreview.value = URL.createObjectURL(file)

  mediaPreviewType.value = file.type.startsWith('video/') ? 'video' : 'image'

  errorMessage.value = ''


    
}

const removeSelectedFile = () => {
  if(mediaPreview.value) {
    URL.revokeObjectURL(mediaPreview.value)
  }

  selectedFile.value = null
  mediaPreview.value = ''
  mediaPreviewType.value = ''
}

const handleEditFileSelect = (event) => {
  const file = event.target.files[0]

  if(!file) return

  const validation = validateMediaFile(file)

  if(!validation.valid) {
    errorMessage.value = validation.error

    event.target.value = ''

    return
  }

  if(editMediaPreview.value) {
    URL.revokeObjectURL(editMediaPreview.value)
  }

  editSelectedFile.value = file

  editMediaPreview.value = URL.createObjectURL(file)

  editMediaPreviewType.value =
    file.type.startsWith('video/')
      ? 'video'
      : 'image'

  errorMessage.value = ''    

}

const removeEditSelectedFile = () => {
  if(editMediaPreview.value) {
    URL.revokeObjectURL(editMediaPreview.value)
  }
  editSelectedFile.value = null
  editMediaPreview.value = ''
  editMediaPreviewType.value = ''
}


const getMediaUrl = (item) => {
  if (item.url) {
    return item.url
  }

  return `http://localhost:3000/uploads/${item.storageKey}`
}

const handleLike = async (post) => {
  if(!authStore.isAuthenticated){
    errorMessage.value = 'Must be logged in to like a post'
    return
  }

  if(likedPostId.value === post.postId){
    return
  }

  likedPostId.value = post.postId
  errorMessage.value = ''

  try{
    if(post.likedByCurrentUser) {
      await api.delete(`/posts/${post.postId}/like`)

      post.likedByCurrentUser = false
      post.likeCount = Math.max(0, (post.likeCount || 0) - 1)
    }else{
      await api.post(`/posts/${post.postId}/like`)
      post.likedByCurrentUser = true
      post.likeCount = (post.likeCount || 0) + 1
    }

  }catch (err) {
    console.error('Like error: ',err)
    errorMessage.value = err.response?.data?.error || 'Failed to update like'
  }finally{
    likedPostId.value = null
  }
}

const nextPage = async () => {
  if(!hasNextPage.value) {
    return
  }

  await loadPosts(currentPage.value + 1)
}

const previousPage = async () => {
  if(!hasPreviousPage.value) {
    return
  }

  await loadPosts(currentPage.value - 1)
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
                Add Media
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" class="hidden" @change="handleFileSelect">
              </label>
              <span v-if="selectedFile" class="text-xs text-gray-500">{{ selectedFile.name }}</span>
            </div>
            <div v-if="mediaPreview" class="relative mt-3">
              <img v-if="mediaPreviewType === 'image'" :src="mediaPreview" alt="Selected image preview" class="w-full max-h-80 object-cover rounded-lg border border-slate-200">
              <video v-else-if="mediaPreviewType === 'video'" :src="mediaPreview" controls class="w-full max-h-80 object-contain rounded-lg border border-slate-200"> Your browser does not support video playback</video>
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
              Change Media

              <input 
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                class="hidden"
                @change="handleEditFileSelect"
              >
            </label>
          </div>

          <div v-if="editMediaPreview" class="relative mt-3">
            <img v-if="editMediaPreviewType === 'image'" :src="editMediaPreview" alt="New Image preview" class="w-full max-h-80 object-cover rounded-lg border border-slate-200">
            <video v-else-if="editMediaPreviewType === 'video'" :src="editMediaPreview" controls class="w-full max-h-80 object-contain rounded-lg border border-slate-200">Your browser does not support video playback.</video>
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
              :src="getMediaUrl(item)"
              :alt="`Image uploaded by ${post.username || 'user'}`" 
              class="w-full max-h-125 object-cover rounded-lg border border-slate-200"/>

              <video 
              v-else-if="item.type === 'video'"
              :src="getMediaUrl(item)"
              controls
              preload="metadata"
              class="w-full max-h-125 rounded-lg border border-slate-200"
              >Your browser does not support video playback.</video>

            </div>

          </div>
          <div class="flex items-center gap-4 mt-3">
            <button
            v-if="authStore.isAuthenticated"
            type="button"
            @click="handleLike(post)"
            :disabled="likedPostId === post.postId"
            class="flex items-center gap-1.5 text-sm transition"
            :class="post.likedByCurrentUser ? 'text-red-600' : 'text-gray-500 hover:text-red-600'"
            >
            <span class="text-lg">
              {{ post.likedByCurrentUser ? '♥' : '♡' }}
            </span>

            <span>
              {{ post.likeCount || 0 }} Likes
            </span>

            </button>

            <span
            v-else
            class="flex items-center gap-1.5 text-sm text-gray-500"
            >
            <span class="text-lg">♡</span>
            <span>{{ post.likeCount || 0 }} Likes</span>

            </span>

            <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition"
            @click="post.showComments = !post.showComments"
            >
            <span class="text-lg">💬</span>

            <span>
              {{ post.commentCount || 0 }}
            </span>

            <span>
              {{ post.showComments ? 'Hide' : 'Comments' }}
            </span>
          
          </button>
          </div>

          <div v-if="authStore.isAuthenticated && authStore.user?.userId === post.userId" class=" flex gap-4 mt-0.5">
            <button type="button" @click="startEditing(post)" class="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
              Edit
            </button>
            <button type="button" @click="handleDeletePost(post)" class="text-indigo-600 hover:text-red-800 text-xs font-medium" >
              Delete
            </button>

            <div
            v-if="authStore.isAuthenticated && authStore.user?.userId === post.userId"
            class="flex gap-4 mt-0.5"
            >
            ...
            </div>

          </div>
        </div>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>By : {{ post.username || 'Unknown' }}</span>
          <span>•</span>
          <span>{{ new Date(post.createdAt).toLocaleDateString() }}</span>
        </div>

        <CommentSection 
        v-if="post.showComments"
        :post-id="post.postId"
        :comment-count = "post.commentCount"
        @comment-count-changed = "post.commentCount = $event"
        />
      </div>
    </div>

    <div v-if="posts.length > 0" class="flex items-center justify-between mt-6">
      <button
      type="button"
      @click="previousPage"
      :disabled="!hasPreviousPage || loading"
      class="px-4 py-2 bg-slate-100 rounded-md disabled:opacity-50"
      >
        Previous
      </button>

      <span class="text-sm text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </span>

      <button
      type="button"
      @click="nextPage"
      :disabled="!hasNextPage || loading"
      class="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
      >
        Next
      </button>

    </div>
    <p v-else-if="errorMessage" class="text-red-500">{{ errorMessage }}</p>
    <p v-else class="text-grey-500">No posts yet</p>
    
    

  </div>
</template>