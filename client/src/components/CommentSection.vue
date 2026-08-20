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
    <div class="mt-4 border-t border-gray-100 pt-4">
        <form v-if="authStore.isAuthenticated" @submit.prevent="submitComment" class="flex gap-2 mb-4">
            <input v-model="newComment" type="text" maxlength="2000" placeholder="Write a comment..." class="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>

            <button
            type="submit"
            :disabled="submitting || !newComment.trim()"
            class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md disabled:opacity-50"
            >
            {{ submitting ? 'Posting...' : 'Comment' }}
            </button>
            
        </form>

        <p v-else class="text-sm text-gray-500" mb-4> Log in to comment</p>

        <div v-if="errorMessage" class="text-sm text-red-500 mb-3">
            {{ errorMessage }}
        </div>

        <div v-if="loading" class="text-sm text-gray-500">
            Loading comments...
        </div>

        <div v-else-if="comments.length > 0" class="space-y-4">
            <CommentItem
            v-for="comment in comments"
            :key="comment.commentId"
            :comment = "comment"
            :post-id = "postId"
            @comment-count-changed="handleCommentCountChange"/>

        </div>

        <p v-else class="text-sm text-gray-500">No comments yet</p>
    </div>


</template>