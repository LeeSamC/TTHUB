import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css'

import {useAuthStore} from './stores/auth.js'

import App from './App.vue'
import router from './router/router.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore(pinia)

await authStore.checkAuth()

app.mount('#app')
