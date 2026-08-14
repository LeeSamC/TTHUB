<script setup>
import {ref} from 'vue';
import {useRouter} from 'vue-router'
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = async () => {
    errorMsg.value = '';
    try{
        await authStore.login({
            username: username.value,
            password: password.value,
        });
        
        await router.push('/');
    }catch (err) {
        errorMsg.value = err.response?.data?.error || 'Login failed'
    }
};


</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div class="bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
            <h2 class="text-2xl font-bold mb-6 text-center">Login to TTHUB</h2>

            <div v-if="errorMsg" class="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm border-red-500/30" >
                {{ errorMsg }}
            </div>

            <form @submit.prevent="handleLogin" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Username</label>
                    <input v-model="username" type="text" required class="w-full bg-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Password</label>
                    <input v-model="password" type="password" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-semibold transition">
                    Sign In
                </button>
            </form>

            <p class="text-sm text-slate-400 mt-4 text-center">
                Don't have an account? <router-link to="/register" class="text-indigo-400 hover:underline">Register</router-link>
            </p>

        </div>
    </div>
</template>