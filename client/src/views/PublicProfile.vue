<script setup>
import {ref, onMounted, watch} from 'vue'
import {useRoute} from 'vue-router'
import api from '../api/api'

const route = useRoute()

const profile = ref(null)

const loading = ref(true)

const errorMessage = ref('')

const loadProfile = async () => {
    loading.value = true
    errorMessage.value = ''

    try{
        const response = await api.get(`/users/${route.params.username}`)

        profile.value = response.data.user
    }catch (error) {
        console.error('Load public profile error', error)

        errorMessage = error.response?.data?.error || 'Failed to load profile'
    }finally{
        loading.value = false
    }
}

onMounted(() => {
    loadProfile()
})

watch(
    () => route.params.username,
    () => {
        loadProfile()
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

                    <div class="mt-4">
                        <h1 class="text-2xl font-bold text-slate-900">
                            {{ profile.firstName }}
                            {{ profile.lastName }}
                        </h1>

                        <p class="text-sm text-slate-500">
                            @{{ profile.username }}
                        </p>
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
        </div>

    </div>
</template>