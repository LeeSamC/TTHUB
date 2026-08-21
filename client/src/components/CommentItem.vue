<script setup>
import {ref} from 'vue'
import api from '../api/api'
import {useAuthStore} from '../stores/auth'

const props = defineProps({
    comment: {
        type: Object,
        required: true
    },

    postId: {
        type: String,
        required: true
    }
})

const emit = defineEmits([
    'comment-count-changed'
])

const authStore = useAuthStore()

const replying = ref(false)
const replyContent = ref('')
const submittingReply = ref(false)

const editing = ref(false)
const editContent = ref('')

const deleting = ref(false)

const errorMessage = ref('')

const submitReply = async () => {
    if(!replyContent.value.trim()) {
        return
    }

    submittingReply.value = true
    errorMessage.value = ''

    try{
        const response = await api.post(`/posts/${props.postId}/comments`, {content: replyContent.value.trim(), parentCommentId: props.comment.commentId})

        if(!props.comment.replies) {
            props.comment.replies = []
        }

        props.comment.replies.push({
            ...response.data.comment,

            username: authStore.user.username,
            firstName: authStore.user.firstName,
            lastName: authStore.user.lastName,
            avatarUrl: authStore.user.avatarUrl,
            replies: []
        })

        replyContent.value = ''
        replying.value = false

        emit('comment-count-changed', 1)
    }catch (error) {
        console.error('Reply error:', error)

        errorMessage.value = error.response?.data?.error || 'Failed to create reply'
    }finally{
        submittingReply.value = false
    }
}

const startEdting = () => {
    editing.value = true
    editContent.value = props.comment.content
}

const cancelEditing = () => {
    editing.value = false
    editContent.value = ''
}

const saveEdit = async () => {
    if(!editContent.value.trim()){
        return
    }

    try{
        const response = await api.patch(`/comments/${props.comment.commentId}`, {content: editContent.value.trim()})

        props.comment.content = response.data.comment.content

        editing.value = false
    }catch (error){
        console.error('Edit comment error:', error)

        errorMessage.value = error.response?.data?.error || 'Failed to edit comment'
    }
}

const deleteComment = async () => {
    if(deleting.value){
        return
    }

    deleting.value = true

    try{
        await api.delete(`/comments/${props.comment.commentId}`)

        props.comment.content = '[Comment deleted]'

        props.comment.deletedAt = new Date().toISOString()

        emit('comment-count-changed', -1)
    }catch (error) {
        console.error('Delete comment error: ', error)

        errorMessage.value = error.response?.data?.error || 'Failed to delete comment'
    }finally{
        deleting.value = false
    }
}
</script>

<template>
  <div class="relative">

    <!-- Comment -->
    <div class="flex items-start gap-3">

      <!-- Avatar -->
      <div
        class="w-9 h-9 rounded-full
               bg-indigo-100 text-indigo-700
               flex items-center justify-center
               text-xs font-bold
               shrink-0 overflow-hidden"
      >
      <img
        v-if="comment.avatarUrl" 
        :src="comment.avatarUrl"
        :alt="`${comment.username || 'User'} avatar`"
        class="w-full h-full object-cover"
      />

      <span v-else>
        {{ comment.firstName?.charAt(0)?.toUpperCase() || 'U' }}
      </span>
        
      </div>

      <div class="min-w-0 flex-1">

        <!-- Comment Bubble -->
        <div
          class="bg-white
                 border border-slate-200
                 rounded-2xl rounded-tl-md
                 px-4 py-3"
        >

          <!-- Author -->
          <div class="flex items-center gap-2">

            <span
              class="text-sm font-semibold text-slate-900"
            >
              {{ comment.username }}
            </span>

            <span class="text-xs text-slate-400">
              {{ new Date(comment.createdAt).toLocaleDateString() }}
            </span>

          </div>

          <!-- Editing -->
          <div
            v-if="editing"
            class="mt-3"
          >

            <input
              v-model="editContent"
              maxlength="2000"
              class="w-full
                     px-3 py-2.5
                     border border-slate-300
                     rounded-lg
                     text-sm
                     outline-none
                     focus:border-indigo-500
                     focus:ring-4
                     focus:ring-indigo-50"
            />

            <div class="flex gap-3 mt-2">

              <button
                type="button"
                @click="saveEdit"
                class="text-xs font-medium
                       text-indigo-600
                       hover:text-indigo-800"
              >
                Save
              </button>

              <button
                type="button"
                @click="cancelEditing"
                class="text-xs font-medium
                       text-slate-500
                       hover:text-slate-700"
              >
                Cancel
              </button>

            </div>

          </div>

          <!-- Content -->
          <p
            v-else
            class="text-sm leading-6
                   text-slate-700 mt-1
                   whitespace-pre-wrap"
          >
            {{ comment.content }}
          </p>

        </div>

        <!-- Actions -->
        <div
          v-if="comment.content !== '[Comment deleted]'"
          class="flex items-center gap-4
                 mt-1.5 ml-2"
        >

          <!-- Reply -->
          <button
            v-if="authStore.isAuthenticated"
            type="button"
            @click="replying = !replying"
            class="text-xs font-medium
                   text-indigo-600
                   hover:text-indigo-800
                   transition"
          >
            {{ replying ? 'Cancel Reply' : 'Reply' }}
          </button>

          <!-- Edit -->
          <button
            v-if="authStore.user?.userId === comment.userId"
            type="button"
            @click="startEdting"
            class="text-xs font-medium
                   text-slate-500
                   hover:text-indigo-600
                   transition"
          >
            Edit
          </button>

          <!-- Delete -->
          <button
            v-if="authStore.user?.userId === comment.userId"
            type="button"
            @click="deleteComment"
            :disabled="deleting"
            class="text-xs font-medium
                   text-slate-500
                   hover:text-rose-600
                   transition
                   disabled:opacity-50"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>

        </div>

        <!-- Reply Form -->
        <form
          v-if="replying"
          @submit.prevent="submitReply"
          class="flex gap-2 mt-3"
        >

          <input
            v-model="replyContent"
            maxlength="2000"
            placeholder="Write a reply..."
            class="flex-1 min-w-0
                   px-3 py-2.5
                   bg-white
                   border border-slate-200
                   rounded-xl
                   text-sm
                   outline-none
                   focus:border-indigo-500
                   focus:ring-4
                   focus:ring-indigo-50"
          />

          <button
            type="submit"
            :disabled="submittingReply || !replyContent.trim()"
            class="px-3 py-2
                   bg-indigo-600 hover:bg-indigo-700
                   disabled:bg-indigo-300
                   text-white
                   text-xs font-medium
                   rounded-lg
                   transition"
          >
            {{ submittingReply ? '...' : 'Reply' }}
          </button>

        </form>

        <!-- Error -->
        <p
          v-if="errorMessage"
          class="text-xs text-rose-600 mt-2"
        >
          {{ errorMessage }}
        </p>

        <!-- Nested Replies -->
        <div
          v-if="comment.replies && comment.replies.length > 0"
          class="relative ml-3 mt-4 pl-5
                 border-l-2 border-indigo-100
                 space-y-4"
        >

          <CommentItem
            v-for="reply in comment.replies"
            :key="reply.commentId"
            :comment="reply"
            :post-id="postId"
            @comment-count-changed="emit('comment-count-changed', $event)"
          />

        </div>

      </div>

    </div>

  </div>
</template>