<script setup>

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notifications'

const router = useRouter()

const notificationStore =
    useNotificationStore()

const getNotificationMessage = (notification) => {

    const actor = notification.actor

    const actorName =
        actor?.username ||
        `${actor?.firstName || ''} ${actor?.lastName || ''}`.trim() ||
        'Someone'

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

    try {

        if (!notification.isRead) {

            await notificationStore.markAsRead(
                notification.notificationId
            )
        }

        if (notification.type === 'follow') {

            if (notification.actor?.username) {

                router.push(
                    `/users/${notification.actor.username}`
                )
            }

            return
        }

        if (notification.postId) {

            router.push(
                `/posts/${notification.postId}`
            )
        }

    } catch (error) {

        console.error(
            'Notification click error:',
            error
        )
    }
}

const markAllRead = async () => {

    try {

        await notificationStore.markAllAsRead()

    } catch (error) {

        console.error(
            'Mark all notifications error:',
            error
        )
    }
}

onMounted(() => {

    notificationStore.loadNotifications()

})

</script>


<template>

    <div
        class="min-h-screen
               bg-slate-50
               py-8
               px-4"
    >

        <div class="max-w-3xl mx-auto">

            <!-- Header -->

            <div
                class="bg-white
                       rounded-2xl
                       border
                       border-slate-200
                       overflow-hidden"
            >

                <div
                    class="px-6 py-5
                           border-b
                           border-slate-200
                           flex
                           items-center
                           justify-between"
                >

                    <div>

                        <h1
                            class="text-2xl
                                   font-bold
                                   text-slate-900"
                        >
                            Notifications
                        </h1>

                        <p
                            class="text-sm
                                   text-slate-500
                                   mt-1"
                        >
                            Stay up to date with activity on your account.
                        </p>

                    </div>


                    <button
                        v-if="notificationStore.unreadCount > 0"
                        @click="markAllRead"
                        class="text-sm
                               text-indigo-600
                               hover:text-indigo-800"
                    >
                        Mark all as read
                    </button>

                </div>


                <!-- Loading -->

                <div
                    v-if="notificationStore.isLoading"
                    class="p-10 text-center"
                >

                    <p class="text-sm text-slate-500">
                        Loading notifications...
                    </p>

                </div>


                <!-- Error -->

                <div
                    v-else-if="notificationStore.errorMessage"
                    class="p-10 text-center"
                >

                    <p class="text-sm text-red-500">
                        {{ notificationStore.errorMessage }}
                    </p>

                </div>


                <!-- Empty -->

                <div
                    v-else-if="
                        notificationStore.notifications.length === 0
                    "
                    class="p-12 text-center"
                >

                    <div class="text-4xl mb-3">
                        🔔
                    </div>

                    <h2
                        class="font-semibold
                               text-slate-900"
                    >
                        No notifications
                    </h2>

                    <p
                        class="text-sm
                               text-slate-500
                               mt-1"
                    >
                        You're all caught up.
                    </p>

                </div>


                <!-- Notification list -->

                <div v-else>

                    <button
                        v-for="
                            notification in
                            notificationStore.notifications
                        "
                        :key="notification.notificationId"
                        @click="
                            handleNotificationClick(
                                notification
                            )
                        "
                        class="w-full
                               text-left
                               px-6 py-4
                               border-b
                               border-slate-100
                               hover:bg-slate-50
                               transition"
                        :class="{
                            'bg-indigo-50':
                                !notification.isRead
                        }"
                    >

                        <div class="flex gap-4">

                            <!-- Avatar -->

                            <div
                                class="w-12 h-12
                                       shrink-0
                                       rounded-full
                                       bg-indigo-100
                                       overflow-hidden
                                       flex
                                       items-center
                                       justify-center
                                       font-bold
                                       text-indigo-700"
                            >

                                <img
                                    v-if="
                                        notification.actor?.avatarUrl
                                    "
                                    :src="
                                        notification.actor.avatarUrl
                                    "
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


                            <!-- Notification -->

                            <div class="flex-1">

                                <p
                                    class="text-sm
                                           text-slate-800"
                                >
                                    {{
                                        getNotificationMessage(
                                            notification
                                        )
                                    }}
                                </p>

                                <p
                                    class="text-xs
                                           text-slate-400
                                           mt-1"
                                >
                                    {{ notification.createdAt }}
                                </p>

                            </div>


                            <!-- Unread indicator -->

                            <div
                                v-if="!notification.isRead"
                                class="w-2 h-2
                                       mt-2
                                       rounded-full
                                       bg-indigo-600"
                            ></div>

                        </div>

                    </button>

                </div>

            </div>

        </div>

    </div>

</template>