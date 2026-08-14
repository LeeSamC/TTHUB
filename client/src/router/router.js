import {createRouter, createWebHistory} from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Profile from '../views/Profile.vue';
import Home from '../views/Home.vue'
import api from '../api/api.js'
import { meta } from 'zod/v4/core';

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
];

//createWebHistoy create clean urls remove /#/
const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to) => {

    if(!to.meta.requiresAuth) {
        return true
    
    }

    try{
            await api.get('/profile');
            return true;
    }catch (err) {
            return { name: 'Home'}
        }

})

export default router