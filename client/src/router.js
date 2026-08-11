import {createRouter, createWebHistory} from 'vue-router';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import Profile from './views/Profile.vue';
import api from './api'

const routes = [
    {path: '/', redirect: '/login'},
    {path: '/login', component: Login},
    {path: '/register', component: Register},
    {
        path: '/profile',
        component: Profile,
        meta: {requiresAuth: true}
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