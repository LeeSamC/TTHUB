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

const selectedAvatar = ref(null)
const avatarPreview = ref(null)
const isUploadingAvatar = ref(false)


const form = reactive({
  firstName: '',
  lastName:'',
  username:'',
  bio: ''
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
  form.bio = user.bio 

  selectedAvatar.value = null
  avatarPreview.value = user.avatarUrl || null

  errorMessage.value = ''
  successMessage.value = ''

  isEditing.value = true
}

const handleAvatarChange = (event) => {
  const file = event.target.files?.[0]

  if(!file){
    return
  }

  if(!file.type.startsWith('image/')) {
    errorMessage.value = 'Avatar must be an image'
    return
  }

  if(file.size > 5 * 1024 * 1024){
    errorMessage.value = 'Avatar must be smaller than 5MB'
    return
  }

  selectedAvatar.value = file

  avatarPreview.value = URL.createObjectURL(file)

  errorMessage.value = ''
}


const handleSave = async () => {
  isSaving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try{

    let avatarMediaId =authStore.user?.avatarMediaId || null
    
    if(selectedAvatar.value) {
      isUploadingAvatar.value = true

      const formData = new FormData()

      formData.append('file', selectedAvatar.value)

      const mediaResponse = await api.post('/media', formData, {headers: {'Content-Type': 'multipart/form-data'}})

      avatarMediaId = mediaResponse.data.media.mediaId

      isUploadingAvatar.value = false
    }


    const res = await api.patch('/profile/update', {
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      bio: form.bio,
      avatarMediaId
    })

    authStore.user = res.data.user

    selectedAvatar.value = null

    successMessage.value = 'Profile update successful'
    isEditing.value = false
  }catch (err) {
    isUploadingAvatar.value = false
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
    form.bio = user.bio 

    avatarPreview.value = user.avatarUrl || null
    selectedAvatar.value = null
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
  <div class="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4">
    <div class="max-w-3xl mx-auto">

      <!-- Page Header -->
      <div class="mb-6">
        <p class="text-sm font-medium text-indigo-600 mb-1">
          Account
        </p>

        <h1 class="text-3xl font-bold tracking-tight text-slate-900">
          Profile Settings
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          Manage your personal information and account settings.
        </p>
      </div>

      <!-- Profile Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <!-- Profile Header -->
        <div class="px-6 py-6 border-b border-slate-100">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div class="flex items-center gap-4">

              <!-- Avatar -->
              <div
                class="w-20 h-20 rounded-full overflow-hidden
                    bg-indigo-100 text-indigo-700
                      flex items-center justify-center
                      text-2xl font-bold
                      ring-4 ring-indigo-50"
              >
              <img 
                v-if="authStore.user?.avatarUrl"
                :src="authStore.user.avatarUrl"
                :alt="`${authStore.user.firstName} avatar`"
                class="w-full h-full object-cover"
              
              />
              <span v-else>
                {{ authStore.user?.firstName?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
                
              </div>

              <div>
                <h2 class="text-lg font-semibold text-slate-900">
                  {{ authStore.user?.firstName }}
                  {{ authStore.user?.lastName }}
                </h2>

                <p class="text-sm text-slate-500">
                  @{{ authStore.user?.username }}
                </p>

                <div class="flex items-center gap-5 mt-3">
                  <div>
                    <span class="font-bold text-slate-900">
                      {{ authStore.user?.postCount || 0 }}
                    </span>
                    <span class="text-sm text-slate-500 ml-1">
                      Posts
                    </span>
                  </div>

                  <div>
                      <span class="font-bold text-slate-900">
                        {{ authStore.user?.commentCount || 0 }}
                      </span>
                      <span class="text-sm text-slate-500 ml-1">
                        Comments
                      </span>
                  </div>

                </div>
              </div>

            </div>

            <button
              v-if="!isEditing"
              type="button"
              @click="startEditing"
              class="inline-flex items-center justify-center gap-2
                     px-4 py-2.5 rounded-lg
                     bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-medium
                     shadow-sm shadow-indigo-200
                     transition-all duration-200
                     hover:shadow-md"
            >
              <span>✎</span>
              Edit Profile
            </button>

          </div>
        </div>

        <!-- Messages -->
        <div class="px-6 pt-6">

          <div
            v-if="successMessage"
            class="flex items-start gap-3 p-4
                   bg-emerald-50 border border-emerald-200
                   text-emerald-700 rounded-xl text-sm"
          >
            <span class="font-bold">✓</span>

            <div>
              <p class="font-medium">
                {{ successMessage }}
              </p>

              <p class="text-xs text-emerald-600 mt-0.5">
                Your profile information has been updated.
              </p>
            </div>
          </div>

          <div
            v-if="errorMessage && !showModal"
            class="flex items-start gap-3 p-4
                   bg-rose-50 border border-rose-200
                   text-rose-700 rounded-xl text-sm"
          >
            <span class="font-bold">!</span>

            <p class="font-medium">
              {{ errorMessage }}
            </p>
          </div>

        </div>



        <!-- Profile Information -->
        <form
          @submit.prevent="handleSave"
          class="p-6 space-y-6"
        >

        <div v-if="isEditing" class="mt-5 pt-5 border-t border-slate-100">
          <label class="block text-sm font-semibold text-slate-800 mb-2">
            Profile Picture
          </label>

          <div class="flex-items-center gap-4">
            <div class="w-20 h-20 rounded-full overflow-hidden
             bg-indigo-100 flex items-center justify-center
             text-indigo-700 text-2xl font-bold">

              <img 
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="Avatar preview"
                class="w-full h-full object-cover"
              />

              <span v-else>
                {{ authStore.user?.firstName?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
            </div>

          </div>
          <label class="inline-flex items-center px-4 py-2.5
                        rounded-lg bg-slate-100
                        hover:bg-slate-200
                        text-slate-700
                        text-sm font-medium mt-3
                        cursor-pointer transition">
              Choose Photo

              <input 
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="handleAvatarChange"
              />
          </label>
          <p class="mt-1 text-xs text-slate-500">
            JPG, PNG, WEBP or GIF. Maximum 5MB.
          </p>
        </div>

          <!-- First Name -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              First Name
            </label>

            <input
              v-if="isEditing"
              v-model="form.firstName"
              type="text"
              required
              class="w-full px-4 py-3 rounded-xl
                     border border-slate-300
                     text-slate-900
                     placeholder-slate-400
                     outline-none
                     transition
                     focus:border-indigo-500
                     focus:ring-4
                     focus:ring-indigo-50"
            />

            <div
              v-else
              class="px-4 py-3 rounded-xl bg-slate-50
                     border border-slate-100"
            >
              <p class="text-sm font-medium text-slate-900">
                {{ authStore.user?.firstName || 'Not provided' }}
              </p>
            </div>
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              Last Name
            </label>

            <input
              v-if="isEditing"
              v-model="form.lastName"
              type="text"
              required
              class="w-full px-4 py-3 rounded-xl
                     border border-slate-300
                     text-slate-900
                     outline-none
                     transition
                     focus:border-indigo-500
                     focus:ring-4
                     focus:ring-indigo-50"
            />

            <div
              v-else
              class="px-4 py-3 rounded-xl bg-slate-50
                     border border-slate-100"
            >
              <p class="text-sm font-medium text-slate-900">
                {{ authStore.user?.lastName || 'Not provided' }}
              </p>
            </div>
          </div>

          <!-- Username -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              Username
            </label>

            <input
              v-if="isEditing"
              v-model="form.username"
              type="text"
              required
              class="w-full px-4 py-3 rounded-xl
                     border border-slate-300
                     text-slate-900
                     outline-none
                     transition
                     focus:border-indigo-500
                     focus:ring-4
                     focus:ring-indigo-50"
            />

            <div
              v-else
              class="px-4 py-3 rounded-xl bg-slate-50
                     border border-slate-100"
            >
              <p class="text-sm font-medium text-slate-900">
                @{{ authStore.user?.username || 'Not provided' }}
              </p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              Bio
            </label>

            <textarea 
              v-if="isEditing"
              v-model="form.bio"
              maxlength="160"
              rows="4"
              placeholder="Tell people a little about yourself..."
              class="w-full px-4 py-3 rounded-xl
                      border border-slate-300
                      text-slate-900
                      placeholder-slate-400
                      outline-none
                      resize-none
                      transition
                      focus:border-indigo-500
                      focus:ring-4
                      focus:ring-indigo-50"
            ></textarea>
            <div v-if="isEditing" class="mt-1 text-right text-xs text-slate-400">
              {{ form.bio.length }}/160
            </div>
            
            <div v-else class="px-4 py-3 rounded-xl bg-slate-50
                          border border-slate-100">
              <p class="text-sm text-slate-700">
                {{ authStore.user?.bio || 'No bio yet' }}
              </p>

            </div>
          </div>

          <!-- Editing Controls -->
          <div
            v-if="isEditing"
            class="flex flex-col-reverse sm:flex-row sm:justify-end
                   gap-3 pt-5 border-t border-slate-100"
          >

            <button
              type="button"
              @click="cancelEditing"
              :disabled="isSaving"
              class="px-5 py-2.5 rounded-lg
                     bg-slate-100 hover:bg-slate-200
                     text-slate-700
                     text-sm font-medium
                     transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isSaving"
              class="px-5 py-2.5 rounded-lg
                     bg-indigo-600 hover:bg-indigo-700
                     text-white
                     text-sm font-medium
                     shadow-sm
                     transition disabled:opacity-50
                     disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Saving changes...' : 'Save Changes' }}
            </button>

          </div>

        </form>

        <!-- Danger Zone -->
        <div class="mx-6 mb-6 rounded-xl border border-rose-200 bg-rose-50/50">

          <div class="p-5">

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div>
                <h3 class="text-sm font-semibold text-rose-900">
                  Delete Account
                </h3>

                <p class="text-sm text-rose-700/80 mt-1 max-w-lg">
                  Permanently delete your account and associated data.
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                @click="openModal"
                class="shrink-0 px-4 py-2.5 rounded-lg
                       border border-rose-300
                       bg-white hover:bg-rose-600
                       text-rose-600 hover:text-white
                       text-sm font-medium
                       transition"
              >
                Delete Account
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>

    <!-- Delete Modal -->
    <teleport to="body">

      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center
               bg-slate-950/60 backdrop-blur-sm p-4"
        @click.self="closeModal"
      >

        <div
          class="w-full max-w-md bg-white rounded-2xl
                 shadow-2xl border border-slate-200
                 overflow-hidden"
        >

          <!-- Modal Header -->
          <div class="p-6 border-b border-slate-100">

            <div class="flex items-start gap-4">

              <div
                class="w-11 h-11 rounded-full
                       bg-rose-100 text-rose-600
                       flex items-center justify-center
                       shrink-0 text-lg"
              >
                ⚠
              </div>

              <div>
                <h3 class="text-lg font-bold text-slate-900">
                  Delete your account?
                </h3>

                <p class="text-sm text-slate-500 mt-1">
                  This action is permanent and cannot be undone.
                </p>
              </div>

            </div>

          </div>

          <!-- Modal Content -->
          <div class="p-6 space-y-5">

            <p class="text-sm leading-6 text-slate-600">
              Enter your password below to confirm that you want to
              permanently delete your account.
            </p>

            <div
              v-if="errorMessage"
              class="p-3 rounded-xl
                     bg-rose-50 border border-rose-200
                     text-rose-700 text-sm"
            >
              {{ errorMessage }}
            </div>

            <div>

              <label
                class="block text-sm font-semibold text-slate-700 mb-2"
              >
                Password
              </label>

              <input
                v-model="password"
                type="password"
                placeholder="Enter your password"
                @keyup.enter="handleDelete"
                class="w-full px-4 py-3 rounded-xl
                       border border-slate-300
                       outline-none
                       transition
                       focus:border-rose-500
                       focus:ring-4
                       focus:ring-rose-50"
              />

            </div>

          </div>

          <!-- Modal Actions -->
          <div
            class="px-6 py-4 bg-slate-50
                   flex flex-col-reverse sm:flex-row
                   sm:justify-end gap-3"
          >

            <button
              type="button"
              @click="closeModal"
              :disabled="isDeleting"
              class="px-4 py-2.5 rounded-lg
                     bg-white border border-slate-200
                     hover:bg-slate-100
                     text-slate-700
                     text-sm font-medium
                     transition"
            >
              Cancel
            </button>

            <button
              type="button"
              @click="handleDelete"
              :disabled="!password || isDeleting"
              class="px-4 py-2.5 rounded-lg
                     bg-rose-600 hover:bg-rose-700
                     text-white
                     text-sm font-medium
                     transition
                     disabled:opacity-50
                     disabled:cursor-not-allowed"
            >
              {{ isDeleting ? 'Deleting account...' : 'Delete Account' }}
            </button>

          </div>

        </div>

      </div>

    </teleport>

  </div>
</template>