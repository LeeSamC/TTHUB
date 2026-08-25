import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import api from '../api/api'

export const useNotificationStore = defineStore('notifications', () => {
    
    const notifications = ref([])
    const isLoading = ref(false)
    const errorMessage = ref('')

    const unreadCount = computed(() => {
        return notifications.value.filter(
            notification => !notification.isRead
        ).length
    })

    const loadNotifications = async () => {
        isLoading.value = true
        errorMessage.value = ''

        try{
            const response = await api.get('/notifications')

            notifications.value = response.data.notifications || []
        }catch (error) {
            console.error('Load notifications error: ', error)

            errorMessage.value = error.response?.data?.error || 'Failed to load notifications'
        }finally{
            isLoading.value = false
        }
    }

    const markAsRead = async (notificationId) => {
        try{
            await api.patch(`/notifications/${notificationId}/read`)

            const notification = notifications.value.find(notification =>  notification.notificationId === notificationId)

            if(notification){
                notification.isRead = true
            }
        }catch (error){
            console.error('Mark notification as read error:', error)
            throw error
        }
    }

    const markAllAsRead = async () => {
        try{
            await api.patch('/notifications/read-all')

            notifications.value.forEach(notification => {
                notification.isRead = true
            })
        }catch (error) {
            console.error('Mark all notifications as read error', error)
            throw error
        }
    }

    const clearNotifications = () => {
        notifications.value = []
    }

    return {
        notifications,
        isLoading,
        errorMessage,
        unreadCount,

        loadNotifications,
        markAsRead,
        markAllAsRead,
        clearNotifications
    }
})