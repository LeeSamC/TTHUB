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
    <div class="border-l-2 border-slate-200 pl-3">
        <div>
            <div class="flex items-center gap-2 text-sm">
                <span class="font-semibold text-slate-800">
                    {{ comment.username }}
                </span>

                <span class="text-xs text-gray-400">
                    {{ new Date(comment.createdAt).toLocaleDateString() }}
                </span>
            </div>

            <div v-if="editing" class="mt-2">
                <input 
                v-model="editContent"
                maxlength="2000"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <div class="flex gap-2 mt-2">
                    <button
                    type="button"
                    @click="saveEdit"
                    class="text-xs text-indigo-600"
                    >
                    Save
                    </button>

                    <button
                    type="button"
                    @click="cancelEditing"
                    class="text-xs text-gray-500"
                    >
                    Cancel
                    </button>
                </div>
            </div>

            <p v-else class="text-sm text-gray-700 mt-1"> {{ comment.content }}</p>

            <div v-if="comment.content != '[Comment deleted]'" class="flex items-center gap-3 mt-2">
                <button
                v-if="authStore.isAuthenticated"
                type="button"
                @click="replying = !replying"
                class="text-xs text-indigo-600 hover:text-indigo-800"
                >
                Reply
                </button>

                <button
                v-if="authStore.user?.userId === comment.userId"
                type="button"
                @click="startEdting"
                class="text-xs text-gray-500 hover:text-indigo-600"
                >
                Edit
                </button>

                <button
                v-if="authStore.user?.userId === comment.userId"
                type="button"
                @click="deleteComment"
                :disabled="deleting"
                class="text-xs text-red-500"
                >
                {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
            </div>

            <form
            v-if="replying"
            @submit.prevent="submitReply"
            class="flex gap-2 mt-3"
            >

            <input 
            v-model="replyContent"
            maxlength="2000"
            placeholder="Write a reply..."
            class="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
            />

            <button
            type="submit"
            :disabled="submittingReply || !replyContent.trim()"
            class="px-3 py-2 bg-indigo-600 text-white text-xs rounded-md disabled:opacity-50"
            >
            {{ submittingReply ? '...' : 'Reply' }}
            </button>

            </form>

            <p v-if="errorMessage" class="text-xs text-red-500">{{ errorMessage }}</p>
        </div>

        <div
        v-if="comment.replies && comment.replies.length > 0"
        class="ml-5 mt-3 space-y-3"
        >

        <CommentItem
        v-for="reply in comment.replies"
        :key = "reply.commentId"
        :comment="reply"
        :post-id="postId"
        @comment-count-changed="emit('comment-count-changed', $event)"/>


        </div>
    </div>
</template>