<script setup>
import { RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
    <AppLayout title="Home">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Welcome, {{ auth.user?.name }}</h1>
            <p class="text-gray-600">
                You are signed in to the AS Travel SPA, talking to the platform API over a bearer token.
            </p>
        </div>
    </AppLayout>
</template>
