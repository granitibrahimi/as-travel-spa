<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const error = ref('');
const processing = ref(false);

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    error.value = '';

    try {
        await auth.login(form);
        router.push(route.query.redirect ? String(route.query.redirect) : { name: 'home' });
    } catch (e) {
        error.value = e.response?.status === 422
            ? (Object.values(e.response.data.errors ?? {})[0]?.[0] ?? 'Invalid credentials.')
            : 'Something went wrong. Please try again.';
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <div class="flex min-h-[70vh] items-center justify-center">
        <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div class="mb-6 text-center text-xl font-bold">
                <span class="text-red-600">AS</span> <span class="text-gray-700">Travel</span>
            </div>

            <form class="space-y-4" @submit.prevent="submit">
                <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                        v-model="form.email"
                        type="email"
                        autocomplete="username"
                        class="w-full rounded border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Password</label>
                    <input
                        v-model="form.password"
                        type="password"
                        autocomplete="current-password"
                        class="w-full rounded border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>

                <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

                <button
                    type="submit"
                    :disabled="processing"
                    class="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                    {{ processing ? 'Signing in…' : 'Sign in' }}
                </button>
            </form>
        </div>
    </div>
</template>
