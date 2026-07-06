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

            <div class="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                <div class="grid grid-cols-2 gap-2">
                    <span class="text-gray-500">Email</span><span>{{ auth.user?.email }}</span>
                    <span class="text-gray-500">Role</span><span>{{ auth.user?.role ?? '—' }}</span>
                    <span class="text-gray-500">Administrator</span><span>{{ auth.isAdministrator ? 'Yes' : 'No' }}</span>
                    <span class="text-gray-500">Permissions</span>
                    <span>{{ auth.user?.permissions?.includes('*') ? 'All (admin)' : (auth.user?.permissions?.length ?? 0) + ' granted' }}</span>
                </div>
            </div>

            <nav class="flex flex-wrap gap-3 pt-2">
                <RouterLink to="/suppliers" class="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                    Suppliers →
                </RouterLink>
            </nav>
        </div>
    </AppLayout>
</template>
