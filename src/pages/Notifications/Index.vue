<script setup>
import { onMounted, ref } from 'vue';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

const notifications = ref(null);
const loading = ref(false);

let request = null;

async function fetchNotifications(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/user-notifications', {
            signal: controller.signal,
            params: { page },
        });
        notifications.value = { data: data.data, ...data.meta };
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => fetchNotifications());

async function markRead(notification) {
    if (notification.is_read) {
        return;
    }

    await api.post(`/user-notifications/${notification.id}/read`);
    notification.is_read = true;
}

// The action_url is a platform (session-authenticated) URL, so it opens in a new
// tab rather than navigating the SPA. Marking read first keeps the badge honest.
async function open(notification) {
    await markRead(notification);

    if (notification.action_url) {
        window.open(notification.action_url, '_blank', 'noopener');
    }
}
</script>

<template>
    <AppLayout title="Notifications" fluid>
        <FullWidthBox title="Notifications" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 40px;"></th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 170px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Notification</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 150px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! notifications">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="notifications.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No notifications.</td>
                        </tr>
                        <tr
                            v-for="notification in (loading ? [] : notifications?.data ?? [])"
                            :key="notification.id"
                            class="hover:bg-gray-50"
                            :class="{ 'bg-red-50/40': ! notification.is_read }"
                        >
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span
                                    v-if="! notification.is_read"
                                    class="inline-block h-2.5 w-2.5 rounded-full bg-red-500"
                                    aria-label="Unread"
                                />
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-500">{{ notification.type_label || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div :class="notification.is_read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'">
                                    {{ notification.title }}
                                </div>
                                <div v-if="notification.body" class="mt-0.5 text-xs text-gray-500">{{ notification.body }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-600">{{ notification.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button
                                        v-if="notification.action_url"
                                        type="button"
                                        class="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                                        @click="open(notification)"
                                    >
                                        Open ↗
                                    </button>
                                    <button
                                        v-if="! notification.is_read"
                                        type="button"
                                        class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-gray-50"
                                        @click="markRead(notification)"
                                    >
                                        Mark read
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="notifications" :paginator="notifications" class="mt-4" @page="fetchNotifications" />
        </FullWidthBox>
    </AppLayout>
</template>
