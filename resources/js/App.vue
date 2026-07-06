<script setup>
import { computed } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();

const showChrome = computed(() => auth.isAuthenticated);

async function logout() {
    await auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div class="min-h-screen">
        <header v-if="showChrome" class="border-b border-gray-200 bg-white">
            <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                <span class="font-semibold">
                    <span class="text-red-600">AS</span> <span class="text-gray-700">Travel</span>
                </span>
                <div class="flex items-center gap-4 text-sm">
                    <span class="text-gray-500">{{ auth.user?.name }}</span>
                    <button type="button" class="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50" @click="logout">
                        Sign out
                    </button>
                </div>
            </div>
        </header>

        <main class="mx-auto max-w-5xl px-6 py-8">
            <RouterView />
        </main>
    </div>
</template>
