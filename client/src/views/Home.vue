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
  <div class="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4">

    <div class="max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

        <div>
          <p class="text-sm font-medium text-indigo-600">
            Community
          </p>

          <h1 class="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to TTHUB
          </h1>

          <p class="text-sm text-slate-500 mt-1">
            See what the community is talking about.
          </p>
        </div>

        <button
          v-if="authStore.isAuthenticated"
          type="button"
          @click="openModal"
          class="inline-flex items-center justify-center gap-2
                 px-4 py-2.5
                 bg-indigo-600 hover:bg-indigo-700
                 text-white text-sm font-medium
                 rounded-xl
                 shadow-sm shadow-indigo-200
                 transition-all duration-200
                 hover:shadow-md"
        >
          <span class="text-lg leading-none">+</span>
          Create Post
        </button>

      </div>

      <!-- Global Error -->
      <div
        v-if="errorMessage && !showModal"
        class="mb-5 p-4 rounded-xl
               bg-rose-50 border border-rose-200
               text-rose-700 text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Create Post Modal -->
      <teleport to="body">

        <div
          v-if="showModal"
          class="fixed inset-0 z-50
                 flex items-center justify-center
                 bg-slate-950/60 backdrop-blur-sm p-4"
          @click.self="closeModal"
        >

          <div
            class="w-full max-w-lg bg-white
                   rounded-2xl shadow-2xl
                   border border-slate-200
                   overflow-hidden"
          >

            <!-- Modal Header -->
            <div
              class="px-6 py-5
                     border-b border-slate-100
                     flex items-center justify-between"
            >

              <div>
                <h2 class="text-lg font-bold text-slate-900">
                  Create a post
                </h2>

                <p class="text-xs text-slate-500 mt-1">
                  Share something with the TTHUB community.
                </p>
              </div>

              <button
                type="button"
                @click="closeModal"
                :disabled="isCreatingPost"
                class="w-9 h-9 rounded-full
                       flex items-center justify-center
                       text-slate-400
                       hover:text-slate-700
                       hover:bg-slate-100
                       transition"
              >
                ✕
              </button>

            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-5">

              <div
                v-if="errorMessage"
                class="p-3 rounded-xl
                       bg-rose-50 border border-rose-200
                       text-rose-700 text-sm"
              >
                {{ errorMessage }}
              </div>

              <textarea
                v-model="content"
                placeholder="What's happening?"
                rows="5"
                class="w-full resize-none
                       px-4 py-3
                       border border-slate-300
                       rounded-xl
                       text-sm text-slate-900
                       placeholder-slate-400
                       outline-none
                       transition
                       focus:border-indigo-500
                       focus:ring-4
                       focus:ring-indigo-50"
              ></textarea>

              <!-- Media Upload -->
              <div class="flex items-center justify-between gap-3">

                <label
                  class="cursor-pointer
                         inline-flex items-center gap-2
                         px-4 py-2.5
                         rounded-lg
                         bg-indigo-50
                         hover:bg-indigo-100
                         text-indigo-700
                         text-sm font-medium
                         transition"
                >
                  <span>＋</span>
                  Add Media

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    class="hidden"
                    @change="handleFileSelect"
                  />
                </label>

                <span
                  v-if="selectedFile"
                  class="text-xs text-slate-500 truncate max-w-50"
                >
                  {{ selectedFile.name }}
                </span>

              </div>

              <!-- Preview -->
              <div
                v-if="mediaPreview"
                class="relative overflow-hidden rounded-xl"
              >

                <img
                  v-if="mediaPreviewType === 'image'"
                  :src="mediaPreview"
                  alt="Selected image preview"
                  class="w-full max-h-80 object-cover"
                />

                <video
                  v-else-if="mediaPreviewType === 'video'"
                  :src="mediaPreview"
                  controls
                  class="w-full max-h-80 object-contain bg-slate-950"
                ></video>

                <button
                  type="button"
                  @click="removeSelectedFile"
                  class="absolute top-3 right-3
                         w-8 h-8 rounded-full
                         bg-slate-950/70
                         hover:bg-slate-950
                         text-white
                         flex items-center justify-center
                         transition"
                >
                  ✕
                </button>

              </div>

            </div>

            <!-- Modal Footer -->
            <div
              class="px-6 py-4
                     bg-slate-50
                     flex justify-end gap-3"
            >

              <button
                type="button"
                @click="closeModal"
                :disabled="isCreatingPost"
                class="px-4 py-2.5
                       bg-white border border-slate-200
                       hover:bg-slate-100
                       text-slate-700
                       text-sm font-medium
                       rounded-lg
                       transition"
              >
                Cancel
              </button>

              <button
                type="button"
                @click="handlePostContent"
                :disabled="(!content.trim() && !selectedFile) || isCreatingPost"
                class="px-5 py-2.5
                       bg-indigo-600 hover:bg-indigo-700
                       disabled:bg-indigo-300
                       text-white
                       text-sm font-medium
                       rounded-lg
                       transition"
              >
                {{
                  isUploadingMedia
                    ? 'Uploading...'
                    : isCreatingPost
                      ? 'Posting...'
                      : 'Publish Post'
                }}
              </button>

            </div>

          </div>

        </div>

      </teleport>

      <!-- Loading -->
      <div
        v-if="loading"
        class="bg-white rounded-2xl
               border border-slate-200
               p-10 text-center"
      >
        <div
          class="w-8 h-8 mx-auto mb-3
                 border-2 border-indigo-200
                 border-t-indigo-600
                 rounded-full animate-spin"
        ></div>

        <p class="text-sm text-slate-500">
          Loading posts...
        </p>
      </div>

      <!-- Posts -->
      <div
        v-else-if="posts.length > 0"
        class="space-y-4"
      >

        <article
          v-for="post in posts"
          :key="post.postId"
          class="bg-white
                 rounded-2xl
                 border border-slate-200
                 shadow-sm
                 overflow-hidden
                 transition-shadow
                 hover:shadow-md"
        >

          <!-- Post Header -->
          <div
            class="px-5 pt-5
                   flex items-start justify-between"
          >

            <div class="flex items-center gap-3">

              <div
                class="w-10 h-10 rounded-full
                       bg-indigo-100 text-indigo-700
                       flex items-center justify-center
                       font-semibold text-sm
                       shrink-0"
              >
                {{ post.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>

              <div>

                <p class="text-sm font-semibold text-slate-900">
                  {{ post.username || 'Unknown' }}
                </p>

                <p class="text-xs text-slate-400">
                  {{ new Date(post.createdAt).toLocaleDateString() }}
                </p>

              </div>

            </div>

            <!-- Owner Controls -->
            <div
              v-if="authStore.isAuthenticated &&
                authStore.user?.userId === post.userId &&
                editingPostId !== post.postId"
              class="flex items-center gap-1"
            >

              <button
                type="button"
                @click="startEditing(post)"
                class="px-2.5 py-1.5
                       rounded-md
                       text-xs font-medium
                       text-indigo-600
                       hover:bg-indigo-50
                       transition"
              >
                Edit
              </button>

              <button
                type="button"
                @click="handleDeletePost(post)"
                class="px-2.5 py-1.5
                       rounded-md
                       text-xs font-medium
                       text-slate-500
                       hover:bg-rose-50
                       hover:text-rose-600
                       transition"
              >
                Delete
              </button>

            </div>

          </div>

          <!-- Editing -->
          <div
            v-if="editingPostId === post.postId"
            class="px-5 py-5"
          >

            <textarea
              v-model="editContent"
              rows="4"
              class="w-full resize-none
                     border border-slate-300
                     rounded-xl px-4 py-3
                     text-sm
                     outline-none
                     focus:border-indigo-500
                     focus:ring-4
                     focus:ring-indigo-50"
            ></textarea>

            <div class="mt-3">

              <label
                class="cursor-pointer inline-flex
                       items-center gap-2
                       px-3 py-2
                       bg-indigo-50
                       hover:bg-indigo-100
                       text-indigo-700
                       rounded-lg
                       text-xs font-medium
                       transition"
              >
                Change Media

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  class="hidden"
                  @change="handleEditFileSelect"
                />
              </label>

            </div>

            <div
              v-if="editMediaPreview"
              class="relative mt-3 overflow-hidden rounded-xl"
            >

              <img
                v-if="editMediaPreviewType === 'image'"
                :src="editMediaPreview"
                class="w-full max-h-80 object-cover"
                alt="New image preview"
              />

              <video
                v-else-if="editMediaPreviewType === 'video'"
                :src="editMediaPreview"
                controls
                class="w-full max-h-80 object-contain bg-slate-950"
              ></video>

              <button
                type="button"
                @click="removeEditSelectedFile"
                class="absolute top-3 right-3
                       w-8 h-8 rounded-full
                       bg-slate-950/70
                       text-white
                       flex items-center justify-center"
              >
                ✕
              </button>

            </div>

            <div class="flex gap-2 mt-4">

              <button
                type="button"
                @click="handleEditContent"
                :disabled="isEditingPost || !editContent.trim()"
                class="px-4 py-2
                       bg-indigo-600 hover:bg-indigo-700
                       disabled:bg-indigo-300
                       text-white
                       rounded-lg
                       text-sm font-medium
                       transition"
              >
                {{ isEditingPost ? 'Saving...' : 'Save Changes' }}
              </button>

              <button
                type="button"
                @click="cancelEdit"
                :disabled="isEditingPost"
                class="px-4 py-2
                       bg-slate-100 hover:bg-slate-200
                       text-slate-700
                       rounded-lg
                       text-sm font-medium
                       transition"
              >
                Cancel
              </button>

            </div>

          </div>

          <!-- Post Content -->
          <div v-else>

            <div class="px-5 pt-4">

              <p
                class="text-[15px] leading-7
                       text-slate-700
                       whitespace-pre-wrap"
              >
                {{ post.content }}
              </p>

            </div>

            <!-- Media -->
            <div
              v-if="post.media && post.media.length > 0"
              class="mt-4 space-y-2"
            >

              <div
                v-for="item in post.media"
                :key="item.mediaId"
              >

                <img
                  v-if="item.type === 'image'"
                  :src="getMediaUrl(item)"
                  :alt="`Image uploaded by ${post.username || 'user'}`"
                  class="w-full max-h-137.5 object-cover"
                />

                <video
                  v-else-if="item.type === 'video'"
                  :src="getMediaUrl(item)"
                  controls
                  preload="metadata"
                  class="w-full max-h-137.5 bg-slate-950"
                ></video>

              </div>

            </div>

            <!-- Actions -->
            <div class="px-5 py-4">

              <div class="flex items-center gap-2">

                <!-- Like -->
                <button
                  type="button"
                  @click="handleLike(post)"
                  :disabled="!authStore.isAuthenticated || likedPostId === post.postId"
                  class="group inline-flex items-center gap-2
                         px-3 py-2 rounded-lg
                         text-sm font-medium
                         transition"
                  :class="post.likedByCurrentUser
                    ? 'text-rose-600 bg-rose-50'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'"
                >

                  <span
                    class="text-lg leading-none transition-transform
                           group-hover:scale-110"
                  >
                    {{ post.likedByCurrentUser ? '♥' : '♡' }}
                  </span>

                  <span>
                    {{ post.likeCount || 0 }}
                  </span>

                </button>

                <!-- Comments -->
                <button
                  type="button"
                  @click="post.showComments = !post.showComments"
                  class="inline-flex items-center gap-2
                         px-3 py-2 rounded-lg
                         text-sm font-medium
                         text-slate-500
                         hover:text-indigo-600
                         hover:bg-indigo-50
                         transition"
                >

                  <span class="text-base">
                    💬
                  </span>

                  <span>
                    {{ post.commentCount || 0 }}
                  </span>

                  <span class="hidden sm:inline">
                    {{ post.showComments ? 'Hide' : 'Comments' }}
                  </span>

                </button>

              </div>

            </div>

          </div>

          <!-- Comments -->
          <div
            v-if="post.showComments"
            class="border-t border-slate-100
                   bg-slate-50/60
                   px-5 py-4"
          >

            <CommentSection
              :post-id="post.postId"
              :comment-count="post.commentCount"
              @comment-count-changed="post.commentCount = $event"
            />

          </div>

        </article>

      </div>

      <!-- Empty State -->
      <div
        v-else
        class="bg-white rounded-2xl
               border border-slate-200
               p-12 text-center"
      >

        <div
          class="w-14 h-14 mx-auto mb-4
                 rounded-full
                 bg-indigo-50
                 text-indigo-600
                 flex items-center justify-center
                 text-2xl"
        >
          ✦
        </div>

        <h2 class="text-lg font-semibold text-slate-900">
          No posts yet
        </h2>

        <p class="text-sm text-slate-500 mt-1">
          Be the first person to share something with the community.
        </p>

        <button
          v-if="authStore.isAuthenticated"
          type="button"
          @click="openModal"
          class="mt-5 px-4 py-2.5
                 bg-indigo-600 hover:bg-indigo-700
                 text-white text-sm font-medium
                 rounded-lg transition"
        >
          Create the first post
        </button>

      </div>

      <!-- Pagination -->
      <div
        v-if="posts.length > 0"
        class="flex items-center justify-between
               mt-6 px-1"
      >

        <button
          type="button"
          @click="previousPage"
          :disabled="!hasPreviousPage || loading"
          class="px-4 py-2
                 rounded-lg
                 bg-white border border-slate-200
                 hover:bg-slate-50
                 text-slate-700
                 text-sm font-medium
                 disabled:opacity-40
                 disabled:cursor-not-allowed
                 transition"
        >
          ← Previous
        </button>

        <span
          class="text-sm font-medium text-slate-500"
        >
          Page
          <span class="text-slate-900">
            {{ currentPage }}
          </span>
          of
          <span class="text-slate-900">
            {{ totalPages }}
          </span>
        </span>

        <button
          type="button"
          @click="nextPage"
          :disabled="!hasNextPage || loading"
          class="px-4 py-2
                 rounded-lg
                 bg-indigo-600 hover:bg-indigo-700
                 text-white
                 text-sm font-medium
                 disabled:bg-indigo-300
                 disabled:cursor-not-allowed
                 transition"
        >
          Next →
        </button>

      </div>

    </div>
  </div>
</template>