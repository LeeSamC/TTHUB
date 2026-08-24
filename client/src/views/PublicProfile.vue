<script setup>
import {ref, onMounted, watch} from 'vue'
import {useRoute} from 'vue-router'
import api from '../api/api'

const route = useRoute()

const profile = ref(null)
const posts = ref([])

const loading = ref(true)
const postsLoading = ref(false)
const followLoading = ref(false)

const errorMessage = ref('')
const postsError = ref('')

const loadProfile = async () => {
    loading.value = true
    errorMessage.value = ''

    try{
        const response = await api.get(`/users/${route.params.username}`)

        profile.value = response.data.user
    }catch (error) {
        console.error('Load public profile error', error)

        errorMessage.value = error.response?.data?.error || 'Failed to load profile'
    }finally{
        loading.value = false
    }
}

const loadPost = async () => {
    postsLoading.value = true
    postsError.value = ''

    try{
        const response = await api.get(`/users/${route.params.username}/posts`, {
            params: {
                page: 1,
                pageSize: 10
            }
        })

        posts.value = response.data.posts
    }catch (error) {
        console.error('Load public profile post error', error)

        postsError.value = error.response?.data?.message || 'Failed to load posts'
    }finally {
        postsLoading.value = false
    }
}

const loadPulicProfile = async () => {
    await loadProfile()

    if(profile.value){
        await loadPost()
    }
}

const toggleFollow = async () => {
    if(!profile.value || followLoading.value) {
        return
    }

    followLoading.value = true

    try{
        if(profile.value.isFollowing) {
            await api.delete(`users/${profile.value.username}/follow`)

            profile.value.isFollowing = false
            profile.value.followerCount --
        }else{
            await api.post(`users/${profile.value.username}/follow`)

            profile.value.isFollowing = true
            profile.value.followerCount ++
        }
    }catch (error){
        console.error('Follow/unfollow error', error)

        console.error(
            error.response?.data?.error ||
            'Failed to update follow status'
        )
    }finally{
        followLoading.value = false
    }
}

onMounted(() => {
    loadPulicProfile()
})

watch(
    () => route.params.username,
    () => {
        profile.value = null
        posts.value = []

        loadPulicProfile()
    }
)
</script>

<template>
    <div class="min-h-screen bg-slate-50 py-8 px-4">
        <div class="max-w-3xl mx-auto">
            <div v-if="loading" class="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                Loading Profile...
            </div>
            <div v-else-if="errorMessage" class="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <h2 class="text-xl font-semibold text-slate-900">
                    Profile not found
                </h2>
                <p class="text-sm text-slate-500 mt-2">
                    {{ errorMessage }}
                </p>
            </div>

            <div v-else-if="profile" class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div class="h-32 bg-indigo-600">    
                </div>

                <div class="px-6 pb-6">
                    <div class="mt-12">
                        <div class="w-24 h-24 rounded-full
                                   bg-indigo-100
                                   border-4 border-white
                                   overflow-hidden
                                   flex items-center justify-center
                                   text-2xl font-bold text-indigo-700">
                            <img
                                v-if="profile.avatarUrl"
                                :src="profile.avatarUrl"
                                :alt="`${profile.username} avatar`"
                                class="w-full h-full object-cover" 
                            />
                            <span v-else>
                                {{ profile.firstName?.charAt(0)?.toUpperCase() }}
                            </span>

                        </div>
                    </div>

                    <div class="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-bold text-slate-900">
                                {{ profile.firstName }}
                                {{ profile.lastName }}
                            </h1>

                            <p class="text-sm text-slate-500">
                                @{{ profile.username }}
                            </p>

                        </div>

                        <button
                        @click="toggleFollow"
                        :disabled="followLoading"
                        class="px-5 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="profile.isFollowing 
                            ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            "
                        >

                        <span v-if="followLoading">
                            Loading...
                        </span>

                        <span v-else>
                            {{ profile.isFollowing ? 'Unfollow': 'Follow' }}
                        </span>

                        </button>
                        

                        
                    </div>

                    <p v-if="profile.bio" class="mt-4 text-sm text-slate-600">
                        {{ profile.bio }}
                    </p>

                    <div class="flex gap-8 mt-6">
                        <div>
                            <p class="text-lg font-bold text-slate-900" >
                                {{ profile.postCount }}
                            </p>
                            <p class="text-xs text-slate-500">
                                Posts
                            </p>
                        </div>

                        <div>
                            <p class="text-lg font-bold text-slate-900" >
                                {{ profile.followerCount }}
                            </p>
                            <p class="text-xs text-slate-500">
                                Followers
                            </p>
                        </div>

                        <div>
                            <p class="text-lg font-bold text-slate-900" >
                                {{ profile.followingCount }}
                            </p>
                            <p class="text-xs text-slate-500">
                                Following
                            </p>
                        </div>

                        <div>
                            <p class="text-lg font-bold text-slate-900">
                                {{ profile.commentCount }}
                            </p>

                            <p class="text-xs text-slate-500">
                                Comments
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-6">
                <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-200">
                        <h2 class="text-lg font-semibold text-slate-900">
                            Posts
                        </h2>
                    </div>

                    <div v-if="postsLoading" class="p-8 text-center text-sm text-slate-500">
                        Loading posts...
                    </div>

                    <div v-else-if="posts.length === 0" class="p-10 text-center">
                        <p class="text-sm text-slate-500">
                            This user hasnt posted anything yet
                        </p>
                    </div>

                    <div v-else>
                        <article v-for="post in posts" :key="post.postId" class="p-6 border-b border-slate-200 last:border-b-0">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full
                                            bg-indigo-100
                                            flex items-center justify-center
                                            text-sm font-bold
                                            text-indigo-700">
                                    {{ post.author?.firstName?.charAt(0)?.toUpperCase() }}
                                </div>

                                <div>
                                    <p class="font-semibold text-slate-900">
                                        {{ post.author?.firstName }}
                                        {{ post.author?.lastName }}
                                    </p>

                                    <p class="text-xs text-slate-500">
                                        @{{ post.author?.username }}
                                    </p>
                                </div>
                            </div>

                            <div v-if="post.content" class="mt-4 text-slate-800 whitespace-pre-wrap">
                                {{ post.content }}
                            </div>


                            <div v-if="post.media?.length" class="mt-4 grid gap-3">
                                <template v-for="item in post.media" :key="item.mediaId">
                                    <img 
                                        v-if="item.type === 'image'"
                                        :src="item.url"
                                        class="w-full max-h-125 object-contain rounded-xl bg-slate-100"
                                    />

                                    <video 
                                        v-else-if="item.type === 'video'"
                                        :src="item.url"
                                        controls
                                        class="w-full max-h-125 rounded-xl bg-black"
                                    ></video>
                                </template>

                            </div>

                            <div class="flex gap-6 mt-4 text-sm text-slate-500">
                                <span>
                                    {{ post.likeCount }} likes
                                </span>
                                <span>
                                    {{ post.commentCount }} Comments
                                </span>
                            </div>

                        </article>
                    </div>
                </div>
            </div>
            

        </div>

    </div>
</template>