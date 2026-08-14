<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/api';

const router = useRouter();
const form = ref({firstName: '', lastName: '', username: '', password: ''})
const errorMsg = ref('');

const handleRegister = async () => {
    errorMsg.value = '';

    if(form.value.password !== form.value.confirmPassword) {
      errorMsg.value = 'Passwords do not match';
      return;
    }

    try{
        const res = await api.post('/auth/register', form.value)
        router.push('/');

    }catch (err) {
        errorMsg.value = err.response?.data?.error || 'Registration failed'
    }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-900 text-white">
    <div class="bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
      <h2 class="text-2xl font-bold mb-6 text-center">Create an Account</h2>
      
      <div v-if="errorMsg" class="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm border border-red-500/30">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-sm font-medium mb-1">First Name</label>
            <input v-model="form.firstName" type="text" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Last Name</label>
            <input v-model="form.lastName" type="text" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Username</label>
          <input v-model="form.username" type="text" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Confirm Password</label>
          <input v-model="form.confirmPassword" type="password" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-semibold transition">
          Register
        </button>
      </form>

      <p class="text-sm text-slate-400 mt-4 text-center">
        Already have an account? <router-link to="/login" class="text-indigo-400 hover:underline">Login</router-link>
      </p>
    </div>
  </div>
</template>