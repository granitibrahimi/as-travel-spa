<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Textarea from '../../components/Form/Textarea.vue';

const router = useRouter();

const form = reactive({ title: '', description: '' });
const attachment = ref(null);
const errors = ref({});
const processing = ref(false);

function onFile(event) {
    attachment.value = event.target.files?.[0] ?? null;
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    // Multipart, so the optional attachment file rides along.
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    if (attachment.value) {
        payload.append('attachment', attachment.value);
    }

    try {
        const { data } = await api.post('/support-tickets', payload);
        router.push(`/support/${data.id}`);
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
    <AppLayout title="New support ticket">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Ticket details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4">
                    <InputText v-model="form.title" label="Title *" :error="errors.title" />
                    <Textarea v-model="form.description" label="Description *" :rows="6" :error="errors.description" />

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Attachment</label>
                        <input
                            type="file"
                            class="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-200"
                            @change="onFile"
                        >
                        <p class="mt-1 text-xs text-gray-500">Optional. Max 10 MB.</p>
                        <p v-if="errors.attachment" class="mt-1 text-xs text-red-600">{{ errors.attachment }}</p>
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/support" class="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Creating…' : 'Create ticket' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
