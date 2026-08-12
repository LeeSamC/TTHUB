<script setup>
import {computed} from 'vue';
import { useRoute } from 'vue-router';

import DefaultLayout from './layouts/DefaultLayout.vue';
import AuthLayout from './layouts/AuthLayout.vue'

const route = useRoute()

const layouts = {
  default: DefaultLayout,
  auth: AuthLayout
}

const layoutComponent = computed(() => {
  const layoutName = route?.meta?.layout || 'default';

  return layouts[layoutName] || DefaultLayout
})
</script>


<template>
  <component :is="layoutComponent">
       <router-view />
  </component>
</template>