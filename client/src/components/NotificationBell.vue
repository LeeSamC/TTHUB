<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import { useRouter } from 'vue-router';
import { useNotificationStore } from '../stores/notifications';

const router = useRouter()

const notificationStore = useNotificationStore()

const isOpen = ref(false)

const notificationContainer = ref(null)

const toggleNotifications = () => {
    isOpen.value = !isOpen.value
}

const closeNotifications = () => {
    isOpen.value = false
}

const handleClickOutside = (event) => {
    if(notificationContainer.value && !notificationContainer.value.contains(event.target)){
        closeNotifications()
    }
}

const getNotificationMessage = (notification) => {
    const actor = notification.actor

    const actorName = actor?.username || `${actor?.firstName || ''} ${actor?.lastName || ''}`.trim() || 'Someone'

    switch (notification.type) {
        case 'follow':
            return `${actorName} started following you`

        case 'like':
            return `${actorName} liked your post`

        case 'comment':
            return `${actorName} commented on your post`

        case 'reply':
            return `${actorName} replied to your comment`

        default:
            return `${actorName} interacted with you`

    }
}

const handleNotificationClick = async (notification) => {
    try{
        if(!notification.isRead) {
            await notificationStore.markAsRead(notification.notificationId)
        }

        closeNotifications()

        if(notification.type === 'follow') {
            if(notification.actor?.username) {
                router.push(`/users/${notification.actor.username}`)
            }
            return 
        }
        

        if(notification.postId){
            router.push(`/posts/${notification.postId}`)
            return
        }
    }catch (error){
        console.error(error)
    }
}

const handleMarkAllRead = async () => {

    try{
        await notificationStore.markAllAsRead()
    }catch (error) {
        console.error(error)
    }
}

onMounted(() => {
    notificationStore.loadNotifications()

    document.addEventListener(
        'click',
        handleClickOutside
    )
})

onUnmounted(() => {
    document.removeEventListener(
        'click',
        handleClickOutside
    )
})

</script>

<template>

    <div
        ref="notificationContainer"
        class="relative"
    >

        <!-- Notification button -->

        <button
            @click.stop="toggleNotifications"
            class="relative p-2 rounded-md hover:bg-indigo-700 transition"
            aria-label="Notifications"
        >

            <!-- Bell -->

            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.8"
                stroke="currentColor"
                class="w-6 h-6"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.31 6.022c1.733.64 3.56 1.082 5.454 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
            </svg>

            <!-- Unread badge -->

            <span
                v-if="notificationStore.unreadCount > 0"
                class="absolute -top-1 -right-1 min-w-5 h-5 px-1
                       flex items-center justify-center
                       bg-red-500 text-white
                       text-xs font-bold
                       rounded-full"
            >
                {{
                    notificationStore.unreadCount > 99
                        ? '99+'
                        : notificationStore.unreadCount
                }}
            </span>

        </button>


        <!-- Dropdown -->

        <div
            v-if="isOpen"
            class="absolute right-0 mt-2 w-96
                   bg-white
                   rounded-xl
                   shadow-xl
                   border border-slate-200
                   overflow-hidden
                   z-50"
        >

            <!-- Header -->

            <div
                class="px-4 py-3
                       border-b border-slate-200
                       flex items-center justify-between"
            >

                <h2 class="font-semibold text-slate-900">
                    Notifications
                </h2>

                <button
                    v-if="notificationStore.unreadCount > 0"
                    @click="handleMarkAllRead"
                    class="text-xs text-indigo-600
                           hover:text-indigo-800"
                >
                    Mark all as read
                </button>

            </div>


            <!-- Loading -->

            <div
                v-if="notificationStore.isLoading"
                class="p-8 text-center text-sm text-slate-500"
            >
                Loading notifications...
            </div>


            <!-- Error -->

            <div
                v-else-if="notificationStore.errorMessage"
                class="p-6 text-center text-sm text-red-500"
            >
                {{ notificationStore.errorMessage }}
            </div>


            <!-- Empty -->

            <div
                v-else-if="notificationStore.notifications.length === 0"
                class="p-8 text-center"
            >

                <div class="text-3xl mb-2">
                    🔔
                </div>

                <p class="text-sm text-slate-500">
                    No notifications yet
                </p>

            </div>


            <!-- Notifications -->

            <div
                v-else
                class="max-h-96 overflow-y-auto"
            >

                <button
                    v-for="notification in notificationStore.notifications.slice(0, 10)"
                    :key="notification.notificationId"
                    @click="handleNotificationClick(notification)"
                    class="w-full text-left px-4 py-3
                           border-b border-slate-100
                           hover:bg-slate-50
                           transition"
                    :class="{
                        'bg-indigo-50':
                            !notification.isRead
                    }"
                >

                    <div class="flex gap-3">

                        <!-- Avatar -->

                        <div
                            class="w-10 h-10
                                   shrink-0
                                   rounded-full
                                   bg-indigo-100
                                   flex items-center justify-center
                                   text-sm font-bold
                                   text-indigo-700
                                   overflow-hidden"
                        >

                            <img
                                v-if="notification.actor?.avatarUrl"
                                :src="notification.actor.avatarUrl"
                                class="w-full h-full object-cover"
                            />

                            <span v-else>
                                {{
                                    notification.actor?.firstName
                                        ?.charAt(0)
                                        ?.toUpperCase()
                                }}
                            </span>

                        </div>


                        <!-- Content -->

                        <div class="flex-1 min-w-0">

                            <p class="text-sm text-slate-800">
                                {{ getNotificationMessage(notification) }}
                            </p>

                            <p
                                class="text-xs text-slate-400 mt-1"
                            >
                                {{ notification.createdAt }}
                            </p>

                        </div>


                        <!-- Unread dot -->

                        <div
                            v-if="!notification.isRead"
                            class="w-2 h-2
                                   mt-2
                                   rounded-full
                                   bg-indigo-600
                                   shrink-0"
                        ></div>

                    </div>

                </button>

            </div>


            <!-- View all -->

            <div
                class="border-t border-slate-200"
            >

                <button
                    @click="
                        closeNotifications();
                        router.push('/notifications')
                    "
                    class="w-full py-3
                           text-sm font-medium
                           text-indigo-600
                           hover:bg-slate-50"
                >
                    View all notifications
                </button>

            </div>

        </div>

    </div>

</template>