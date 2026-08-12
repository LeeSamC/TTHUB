import {createRouter, createWebHistory} from 'vue-router';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import Profile from './views/Profile.vue';
import Home from './views/Home.vue'
import api from './api'
import { meta } from 'zod/v4/core';

const routes = [
    {path: '/', redirect:'/home'},
    {
        path: '/login', 
        component: Login,
        meta: {layout: 'auth'}
    },
    {
        path: '/register', 
        component: Register,
        meta: {layout: 'auth'}
    },
    {
        path: '/home',
        component: Home,
        meta: { layout: 'default', requiresAuth: true}
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

router.beforeEach(async (to, from) => {
    if(to.meta.requiresAuth) {
        try{
            await api.get('/profile');
            return true;
        }catch (err) {
            return '/login'
        }
    
    }
    return true;
})

export default router