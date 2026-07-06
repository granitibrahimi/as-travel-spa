<script setup>
import { onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();

const message = ref(null);
const thread = ref([]);

// GET /messages/{id} returns { message, thread }. The API marks the message read
// server-side for a receiver, so no separate mark-read call is needed here.
async function load(id) {
    message.value = null;
    const { data } = await api.get(`/messages/${id}`);
    message.value = data.message?.data ?? data.message;
    thread.value = data.thread ?? [];
}

onMounted(() => load(route.params.id));

// Re-fetch when navigating between thread items (same component, changed param).
watch(() => route.params.id, (id) => {
    if (id) {
        load(id);
    }
});
</script>

<template>
    <AppLayout :title="message?.subject ?? 'Message'" fluid>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2">
                <FullWidthBox :title="message?.subject ?? 'Message'" :collapsible="false">
                    <Loader v-if="! message" />
                    <template v-else>
                        <p class="mb-2 text-sm text-gray-500">From: {{ message.sender ?? '-' }} · {{ message.created_at }}</p>
                        <p class="mb-4 text-sm text-gray-500">To: {{ message.receivers }}</p>
                        <div class="whitespace-pre-line text-sm text-gray-800">{{ message.message }}</div>
                    </template>

                    <template #footer>
                        <RouterLink to="/messages" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                            Back to list
                        </RouterLink>
                    </template>
                </FullWidthBox>
            </div>

            <FullWidthBox title="Other messages" :collapsible="false">
                <p v-if="thread.length === 0" class="text-sm text-gray-400">No other messages.</p>
                <ul class="divide-y divide-gray-100">
                    <li v-for="item in thread" :key="item.id">
                        <RouterLink :to="`/messages/${item.id}`" class="flex items-center justify-between gap-2 py-2 text-sm hover:text-red-600">
                            <span :class="{ 'font-semibold': item.unread }">{{ item.subject }}</span>
                            <span class="whitespace-nowrap text-xs text-gray-400">{{ item.created_at }}</span>
                        </RouterLink>
                    </li>
                </ul>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
