<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Textarea from '../../components/Form/Textarea.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const active = ref(null);
const other = ref(null);
const answers = reactive({});
const errors = reactive({});
const claiming = ref(null);

const alertClass = {
    info: 'border-sky-200 bg-sky-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
};

async function load() {
    const [activeRes, otherRes] = await Promise.all([
        api.get('/announcements/active'),
        api.get('/announcements/other'),
    ]);
    active.value = activeRes.data.data ?? activeRes.data;
    other.value = otherRes.data.data ?? otherRes.data;

    const ids = [...active.value, ...other.value].map((a) => a.id);

    if (ids.length) {
        await api.post('/announcements/mark-seen', { ids });
    }
}

onMounted(load);

async function claim(announcement) {
    claiming.value = announcement.id;
    errors[announcement.id] = '';

    try {
        await api.post(`/announcements/${announcement.id}/claim`, {
            answer: answers[announcement.id] ?? '',
        });
        await load();
    } catch (e) {
        errors[announcement.id] = e.response?.data?.errors?.answer?.[0] ?? 'Could not claim.';
    } finally {
        claiming.value = null;
    }
}
</script>

<template>
    <AppLayout title="New announcements">
        <div class="space-y-6">
            <FullWidthBox title="New announcements" :collapsible="false">
                <Loader v-if="! active" />
                <template v-else>
                    <p v-if="active.length === 0" class="text-gray-500">No active announcements!</p>
                    <div v-for="announcement in active" :key="announcement.id" class="mb-4 rounded border p-4" :class="alertClass[announcement.priority_class]">
                        <h3 class="mb-1 font-semibold">{{ announcement.id }}# {{ announcement.title }}</h3>
                        <p class="mb-3 whitespace-pre-line text-sm text-gray-700">{{ announcement.message }}</p>

                        <div v-if="auth.can('announcements.claim')" class="space-y-2">
                            <Textarea v-model="answers[announcement.id]" label="Answer" :rows="2" :error="errors[announcement.id]" />
                            <Button variant="primary" size="sm" :disabled="claiming === announcement.id" @click="claim(announcement)">
                                {{ claiming === announcement.id ? 'Claiming…' : 'Claim' }}
                            </Button>
                        </div>
                    </div>
                </template>
            </FullWidthBox>

            <FullWidthBox title="Other announcements from the last 7 days" :collapsible="false">
                <Loader v-if="! other" />
                <template v-else>
                    <p v-if="other.length === 0" class="text-gray-500">Nothing here.</p>
                    <div v-for="announcement in other" :key="announcement.id" class="mb-3 rounded border p-4" :class="alertClass[announcement.priority_class]">
                        <h3 class="mb-1 font-semibold">{{ announcement.id }}# {{ announcement.title }}</h3>
                        <p class="mb-2 whitespace-pre-line text-sm text-gray-700">{{ announcement.message }}</p>
                        <p class="text-sm text-gray-500">Claimed by: {{ announcement.assigned_to ?? '-' }}</p>
                        <p class="text-sm text-gray-500">Answer: {{ announcement.answer }}</p>
                    </div>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
