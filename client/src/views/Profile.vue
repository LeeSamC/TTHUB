<script setup>
import {ref, reactive, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/api'
import { success } from 'zod'

const router = useRouter()
const authStore = useAuthStore()

const isSaving = ref(false)
const isEditing = ref(false)
const isDeleting = ref(false)

const successMessage = ref('')
const errorMessage = ref('')
const showModal = ref(false)

const password = ref('')


const form = reactive({
  firstName: '',
  lastName:'',
  username:''
})

const openModal = () => {
  password.value = '',
  errorMessage.value = '',
  showModal.value = true
}

const closeModal = () => {
  if (isDeleting.value) return;
  showModal.value = false
  password.value = ''
  errorMessage.value = ''
}

const startEditing = () => {
  const user = authStore.user

  if(!user){
    return
  }

  form.firstName = user.firstName
  form.lastName = user.lastName
  form.username = user.username

  errorMessage.value = ''
  successMessage.value = ''

  isEditing.value = true
}


const handleSave = async () => {
  isSaving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try{
    const res = await api.patch('/profile/update', {
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username
    })

    authStore.user = res.data.user

    successMessage.value = 'Profile update successful'
    isEditing.value = false
  }catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to update profile'
  }finally {
    isSaving.value = false
  }
}

const cancelEditing = () => {

  const user = authStore.user

  if(user) {
    form.firstName = user.firstName
    form.lastName = user.lastName
    form.username = user.username
  }

  
  isEditing.value = false
  errorMessage.value = ''
}

const handleDelete = async () => {
  if (!password.value) return

  isDeleting.value = true;
  errorMessage.value = ''

  try{
    await api.delete('/profile/delete', {
      data: {password: password.value}
    })

    authStore.user = null

    showModal.value = false

    await router.push('/')  
  }catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to delete account'
  }finally{
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto mt-10 mb-10 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-900">User Profile</h1>

      <button v-if="!isEditing" @click="startEditing" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-md font-medium text-sm transition"> 
        Edit profile
      </button>

      <button type="button" @click="openModal" class="bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm px-4 py-2 rounded-md transition self-start sm:self-center shrink-0"> 
        Delete Account
      </button>

    </div>

    <teleport to='body'>
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="closeModal">
        <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
          <div class="flex items-center gap-3" >
            <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold text-lg">
              ⚠️
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">Confirm Account Deletion</h3>
              <p class="text-xs text-slate-500">This action cannot be undone.</p>
            </div>
          </div>

          <p class="text-sm text-slate-600">
            Please enter your password to confirm you want to permanently delete your account.
          </p>

          <div v-if="errorMessage" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
            {{ errorMessage }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Your Password</label>
            <input v-model="password" type="password" placeholder="Enter password" @keyup.enter="handleDelete" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" :disabled="isDeleting" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition"> 
              Cancel
            </button>

            <button type="button" @click="handleDelete" :disabled="!password || isDeleting" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition flex items-center gap-2">
              {{ isDeleting ? 'Deleting...': 'Delete' }}
            </button>
          </div>  

        </div>

      </div>
    </teleport>

    <div v-if="successMessage" class="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm">
      {{ successMessage }}
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-sm">
      {{ errorMessage }}
    </div>

    <form v-else @submit.prevent="handleSave" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">First Name</label>
        <input v-if="isEditing" v-model="form.firstName" type="text" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <p v-else class="text-slate-900 font-medium py-2">{{ authStore.user?.firstName }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
        <input v-if="isEditing" v-model="form.lastName" type="text" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <p v-else class="text-slate-900 font-medium py-2">{{ authStore.user?.lastName }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
        <input v-if="isEditing" v-model="form.username" type="text" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <p v-else class="text-slate-900 font-medium py-2">{{ authStore.user?.username }}</p>
      </div>

      <div v-if="isEditing" class="flex gap-3 pt-4 border-t border-slate-100">
        <button type="submit" :disabled="isSaving" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50">{{ isSaving ? 'Saving...' : 'Save' }}</button>

        <button type="button" @click="cancelEditing" :disabled="isSaving" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition">Cancel</button>
      </div>

    </form>

  </div>
</template>