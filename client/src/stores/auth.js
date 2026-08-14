import { defineStore } from 'pinia'
import {ref, computed} from 'vue'
import api from '../api/api'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)

    const isLoading = ref(true)

    const isAuthenticated = computed(() => {
        return user.value != null
    })

    const checkAuth = async () => {
        try{
            const response = await api.get('/profile')

            user.value = response.data.user

            return true
        }catch {
            user.value = null;
            return false
        }finally{

            isLoading.value = false
        }
    }


    const login = async (credentials) => {
        const response = await api.post('/auth/login', credentials)

        await checkAuth()

        return response.data
    }

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData)

        await checkAuth()

        return response.data
    }

    const logout = async () => {

        try{
            await api.post('/auth/logout')
        }finally{
            user.value = null
        }
    
    } 

    return {
        user, isLoading, isAuthenticated, checkAuth, login, register, logout
    }
})