<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

// Hardcoded from AnnouncementPriorityEnum (Info=1, Warning=2, Danger=3).
const priorities = [
    { value: 1, label: 'Info' },
    { value: 2, label: 'Warning' },
    { value: 3, label: 'Danger' },
];

const form = reactive({ title: '', message: '', priority: 1 });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/announcements/${id}`);
        const announcement = data.data ?? data;
        form.title = announcement.title ?? '';
        form.message = announcement.message ?? '';
        form.priority = announcement.priority ?? 1;
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/announcements/${id}`, form) : api.post('/announcements', form));
        router.push('/announcements');
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
    <AppLayout :title="isEdit ? 'Edit announcement' : 'New announcement'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Announcement details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4">
                    <InputText v-model="form.title" label="Title *" :error="errors.title" />
                    <Select v-model="form.priority" :options="priorities" label="Priority *" :error="errors.priority" />
                    <Textarea v-model="form.message" label="Message *" :rows="6" :error="errors.message" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/announcements" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update announcement' : 'Create announcement') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
