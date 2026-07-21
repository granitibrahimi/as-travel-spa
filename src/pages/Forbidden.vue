<script setup>
import { RouterLink } from 'vue-router';
import { routeUrl } from '../helpers/route.js';
import AppLayout from '../layouts/AppLayout.vue';
</script>

<template>
    <AppLayout title="Unauthorized">
        <div class="py-16 text-center">
            <p class="text-5xl font-bold text-gray-300">403</p>
            <p class="mt-3 text-gray-600">This action is unauthorized.</p>
            <RouterLink :to="routeUrl('home')" class="mt-4 inline-block text-sm text-red-700 hover:underline">← Back home</RouterLink>
        </div>
    </AppLayout>
</template>