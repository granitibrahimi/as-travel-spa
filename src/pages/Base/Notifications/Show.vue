<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { useNotificationsStore } from '../../../stores/notifications';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const notifications = useNotificationsStore();
const id = route.params.id;

const notification = ref(null);
const title = computed(() => notification.value?.title ?? `Notification #${id}`);

onMounted(async () => {
    const { data } = await api.get(`/user-notifications/${id}`);
    notification.value = data.data ?? data;

    // The server marks it read on show — keep the header badge honest.
    notifications.fetchUnread();
});
</script>

<template>
    <AppLayout :title="`Notification #${id}`" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="! notification" />

            <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <h4 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h4>
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-32 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ notification.id }}</td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Type</th>
                                <td class="border border-gray-300 px-2 py-2">{{ notification.type_label || '—' }}</td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Title</th>
                                <td class="border border-gray-300 px-2 py-2">{{ notification.title }}</td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Body</th>
                                <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ notification.body ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Action URL</th>
                                <td class="border border-gray-300 px-2 py-2 break-all">
                                    <a v-if="notification.action_url" :href="notification.action_url" target="_blank" rel="noopener" class="text-red-700 hover:underline">
                                        {{ notification.action_url }}
                                    </a>
                                    <span v-else>—</span>
                                </td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created at</th>
                                <td class="border border-gray-300 px-2 py-2">{{ notification.created_at }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <h4 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Recipients</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">User</th>
                                    <th class="border border-gray-300 px-2 py-2" style="width: 140px;">First seen</th>
                                    <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Last seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="(notification.recipients ?? []).length === 0">
                                    <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No recipients.</td>
                                </tr>
                                <tr v-for="recipient in (notification.recipients ?? [])" :key="recipient.id" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2">{{ recipient.user ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ recipient.first_read_at ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ recipient.last_read_at ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <template #footer>
                <RouterLink to="/notifications" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to notifications
                </RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
