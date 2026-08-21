<script setup>
import {ref, onMounted} from 'vue'
import api from '../api/api'
import { useAuthStore } from '../stores/auth';
import CommentItem from './CommentItem.vue'

const props = defineProps({
    postId: {
        type: String,
        required: true
    },

    commentCount: {
        type: Number,
        default: 0
    }
})

const emit = defineEmits([
    'comment-count-changed'
])

const authStore = useAuthStore()

const comments = ref([])
const loading = ref(false)
const submitting = ref(false)

const newComment = ref('')
const errorMessage = ref('')

const loadComments = async () => {
    loading.value = true
    errorMessage.value = ''

    try{
        const response = await api.get(`/posts/${props.postId}/comments`)
        comments.value = response.data.comments || []
    }catch (error) {
        console.error('Load comments error:', error)

        errorMessage.value = error.response?.data?.error || 'Failed to load comments'
    }finally{
        loading.value = false
    }
}

const submitComment = async () => {
    if(!authStore.isAuthenticated) {
        errorMessage.value = 'You must be logged in to comment'
        return
    }

    if(!newComment.value.trim()){
        return
    }

    submitting.value = true
    errorMessage.value = ''

    try{
        const response = await api.post(`/posts/${props.postId}/comments`, {content: newComment.value.trim()})

        comments.value.push(
            {
                ...response.data.comment,

                username: authStore.user.username,

                firstName: authStore.user.firstName,

                lastName: authStore.user.lastName,

                replies: []
            }
        )

        newComment.value = ''

        emit(
            'comment-count-changed',
            props.commentCount + 1
        )
    }catch (error){
        console.error('Create comment error:', error)

        errorMessage.value = error.response?.data?.error || 'Failed to create comment'
    }finally{
        submitting.value = false
    }
}

const handleCommentCountChange = (amount) => {
    emit(
        'comment-count-changed',
        props.commentCount + amount
    )
}

onMounted(() => {
    loadComments()
})
</script>

<template>
  <div class="space-y-4">

    <!-- Comment Composer -->
    <form
      v-if="authStore.isAuthenticated"
      @submit.prevent="submitComment"
      class="flex items-start gap-3"
    >

      <!-- Avatar -->
      <div
        class="w-9 h-9 rounded-full
               bg-indigo-100 text-indigo-700
               flex items-center justify-center
               text-xs font-bold
               shrink-0"
      >
        {{ authStore.user?.firstName?.charAt(0)?.toUpperCase() || 'U' }}
      </div>

      <div class="flex-1 flex gap-2">

        <input
          v-model="newComment"
          type="text"
          maxlength="2000"
          placeholder="Write a comment..."
          class="flex-1 min-w-0
                 px-4 py-2.5
                 bg-white
                 border border-slate-200
                 rounded-xl
                 text-sm
                 outline-none
                 transition
                 focus:border-indigo-500
                 focus:ring-4
                 focus:ring-indigo-50"
        />

        <button
          type="submit"
          :disabled="submitting || !newComment.trim()"
          class="px-4 py-2.5
                 bg-indigo-600 hover:bg-indigo-700
                 disabled:bg-indigo-300
                 text-white
                 rounded-xl
                 text-sm font-medium
                 transition"
        >
          {{ submitting ? '...' : 'Comment' }}
        </button>

      </div>

    </form>

    <p
      v-else
      class="text-sm text-slate-500 bg-white
             border border-slate-200
             rounded-xl p-4"
    >
      Please log in to join the conversation.
    </p>

    <!-- Error -->
    <div
      v-if="errorMessage"
      class="p-3 rounded-xl
             bg-rose-50 border border-rose-200
             text-rose-700 text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center gap-2
             text-sm text-slate-500 py-3"
    >
      <div
        class="w-4 h-4 rounded-full
               border-2 border-indigo-200
               border-t-indigo-600
               animate-spin"
      ></div>

      Loading comments...
    </div>

    <!-- Comments -->
    <div
      v-else-if="comments.length > 0"
      class="space-y-4"
    >

      <CommentItem
        v-for="comment in comments"
        :key="comment.commentId"
        :comment="comment"
        :post-id="postId"
        @comment-count-changed="handleCommentCountChange"
      />

    </div>

    <!-- Empty -->
    <div
      v-else
      class="text-center py-5"
    >

      <p class="text-sm text-slate-500">
        No comments yet.
      </p>

      <p class="text-xs text-slate-400 mt-1">
        Start the conversation.
      </p>

    </div>

  </div>
</template>