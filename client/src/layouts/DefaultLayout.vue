<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore()
const isLoggingOut = ref(false);


const handleLogout = async () => {
    isLoggingOut.value = true;
    try{
        await authStore.logout()
        await router.push('/')
    }catch (err){
        console.log(err)
    }finally{
        isLoggingOut.value = false
    }
}
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <header class="bg-indigo-600 text-white shadow-md">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div class="flex items-center gap-8">
                    <router-link to="/home" class="text-xl font-bold tracking-tight hover:opacity-90">
                        TTHUB
                    </router-link>

                    <nav class="flex gap-2">
                        <router-link to="/home" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition" active-class="bg-indigo-700 font-semibold">
                            Home
                        </router-link>

                        <router-link 
                        v-if="authStore.isAuthenticated"
                            to="/profile" 
                            class="px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
                            active-class="bg-indigo-700 font-semibold">
                            Profile
                        </router-link>
                    </nav>
                </div>

                <div>
                    <div v-if="!authStore.isLoading">
                        <template v-if="authStore.isAuthenticated">
                            <button
                                @click="handleLogout"
                                :disabled="isLoggingOut"
                                class="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50"
                            >{{ isLoggingOut? "Logging out...": "Logout" }}</button>
                        </template>
                        <template v-else>
                            <router-link 
                                to="/login"
                                class="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-md text-sm font-medium transition mr-2"
                            >Login</router-link>

                            <router-link 
                                to="/register"
                                class="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                            >Register</router-link>
                        </template>

                    </div>
                    <div v-else class="text-white text-sm">Loading</div>
                </div>

                
            </div>
        </header>

        <main>
            <slot>
                <router-view />
            </slot>
        </main>

        <footer class="bg-white border-t border-slate-200 py-4 text-center text-sm text-slate-500">
            © 2026 TTHUB. HttpOnly Cookie & Dual-Token Protected.
        </footer>

    </div>
</template>