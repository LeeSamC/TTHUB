import {createRouter, createWebHistory} from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Profile from '../views/Profile.vue';
import Home from '../views/Home.vue'
import Notifications from '../views/Notification.vue';
import api from '../api/api.js'

import { useAuthStore } from '../stores/auth';

const routes = [
    {
        path: '/', 
        name: 'Home',
        component: Home,
        meta: { layout: 'default', requiresAuth: false}

    },
    {
        path: '/login', 
        component: Login,
        meta: {layout: 'auth', requiresAuth: false}
    },
    {
        path: '/register', 
        component: Register,
        meta: {layout: 'auth', requiresAuth: false}
    },
    {
        path: '/home',
        redirect: '/'
    },
    {
        path: '/profile',
        component: Profile,
        meta: {layout: 'default', requiresAuth: true}
    },

    {
        path: '/profile/:username',
        name: 'public-profile',
        component: () => import('../views/PublicProfile.vue')
    },

    {
        path: '/notifications',
        component: Notifications,
        meta: { requiresAuth: true}
    }


];

//createWebHistoy create clean urls remove /#/
const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if(to.meta.requiresAuth && !authStore.isAuthenticated) {
        return{
            name: 'Home'
        }
    }

    return true

})

export default router