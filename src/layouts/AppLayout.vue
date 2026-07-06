<script setup>
import { computed, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

/**
 * App chrome for authenticated pages: top bar (brand, page title, user + sign
 * out) and a content container. Mirrors the platform AppLayout's `title` /
 * `fluid` contract so migrated pages need no template changes.
 */
const props = defineProps({
    title: { type: String, default: '' },
    fluid: { type: Boolean, default: false },
});

const auth = useAuthStore();
const router = useRouter();

const containerClass = computed(() => (props.fluid ? 'w-full px-6' : 'mx-auto max-w-6xl px-6'));

watch(() => props.title, (title) => {
    document.title = title ? `${title} · AS Travel` : 'AS Travel';
}, { immediate: true });

async function signOut() {
    await auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div class="min-h-screen bg-gray-50 pt-14 text-gray-900">
        <header class="fixed inset-x-0 top-0 z-30 h-14 border-b border-gray-200 bg-white">
            <div class="flex h-full items-center gap-4 px-6">
                <RouterLink to="/" class="font-semibold">
                    <span class="text-red-600">AS</span> <span class="text-gray-700">Travel</span>
                </RouterLink>

                <h1 v-if="title" class="flex-1 truncate text-center text-lg font-bold">{{ title }}</h1>
                <div v-else class="flex-1" />

                <div class="flex items-center gap-3 text-sm">
                    <span class="hidden text-gray-500 sm:inline">{{ auth.user?.name }}</span>
                    <button
                        type="button"
                        class="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                        @click="signOut"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </header>

        <main class="py-8">
            <div :class="containerClass">
                <slot />
            </div>
        </main>
    </div>
</template>
