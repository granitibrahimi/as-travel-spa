<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';

const router = useRouter();

const form = reactive({ subject: '', message: '', users: [] });
const errors = ref({});
const processing = ref(false);

// Recipient options. In the platform these are injected into the Inertia page
// from UsersRepository::getListOfActiveUsers() ([{ value, label }]). There is no
// JSON API endpoint for that list yet — the SPA fetches from `/messages/recipients`,
// which must be added to the platform API (see final notes).
const users = ref(null);

onMounted(async () => {
    try {
        const { data } = await api.get('/messages/recipients');
        users.value = data.data ?? data;
    } catch {
        users.value = [];
    }
});

function toggleUser(id) {
    const index = form.users.indexOf(id);

    if (index === -1) {
        form.users.push(id);
    } else {
        form.users.splice(index, 1);
    }
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post('/messages', form);
        router.push('/messages');
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="New message">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Message details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4">
                    <InputText v-model="form.subject" label="Subject *" :error="errors.subject" />
                    <Textarea v-model="form.message" label="Message *" :rows="6" :error="errors.message" />

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Recipients *</label>
                        <Loader v-if="! users" />
                        <div v-else class="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded border border-gray-200 p-3 sm:grid-cols-2 md:grid-cols-3">
                            <label v-for="user in users" :key="user.value" class="flex items-center gap-2 text-sm">
                                <input type="checkbox" :value="user.value" :checked="form.users.includes(user.value)" @change="toggleUser(user.value)">
                                {{ user.label }}
                            </label>
                            <p v-if="users.length === 0" class="text-sm text-gray-400">No recipients available.</p>
                        </div>
                        <p v-if="errors.users" class="mt-1 text-xs text-red-600">{{ errors.users }}</p>
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/messages" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Sending…' : 'Send message' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
