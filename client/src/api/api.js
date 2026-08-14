import axios from 'axios';
import { promise } from 'zod';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    withCredentials: true
})

const isAuthEndpoint = (url = '') => {
    return(
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout')
    )

} 

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if(!originalRequest) {
            return Promise.reject(error)
        }

        if(error.response?.status !== 400) {
            return Promise.reject(error)
        }

        if(isAuthEndpoint(originalRequest.url)) {
            return Promise.reject(error)
        }

        if(originalRequest._retry) {
            return Promise.reject(error)
        }

        originalRequest._retry = true;

        try{
            await api.post('/auth/refresh')

            return api(originalRequest)
        }catch (refreshError){
            return Promise.reject(refreshError)
        }
    }
)

export default api;