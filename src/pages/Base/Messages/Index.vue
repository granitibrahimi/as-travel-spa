<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

// All data comes from the platform JSON API (bearer token). Paths are relative
// to the api client's base (VITE_API_URL, e.g. https://csrm.test/api/v1).
const auth = useAuthStore();

const messages = ref(null);
const loading = ref(false);
const search = ref('');

// Row queued for deletion — opens the confirm dialog.
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchMessages(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/messages', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        // Resource collection envelope: rows in `data`, paginator in `meta`.
        messages.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchMessages());

// Messages have ≤4 row actions, so they live in the ⋯ dropdown (see CLAUDE.md).
const rowActions = (message) => [
    ...(auth.can('messages.show') ? [{ label: 'View message', href: `/messages/${message.id}` }] : []),
    ...(auth.can('messages.delete') ? [{ label: 'Delete message', danger: true, action: () => (toDelete.value = message) }] : []),
];

async function confirmDelete() {
    if (deleting.value || ! toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/messages/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchMessages(messages.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout title="Messages" fluid>
        <FullWidthBox title="Messages" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchMessages()">
                <div class="w-full sm:w-72">
                    <label class="mb-1 block text-sm font-medium text-gray-700">Search</label>
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Subject…"
                        class="w-full rounded border border-gray-300 px-2 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>
                <button type="submit" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Search</button>
                <button type="button" class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchMessages();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Subject</th>
                            <th class="border border-gray-300 px-2 py-2">Sent by</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 140px;">Sent</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! messages">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="messages.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No messages found.</td>
                        </tr>
                        <tr v-for="message in (loading ? [] : messages?.data ?? [])" :key="message.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ message.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink v-if="auth.can('messages.show')" :to="`/messages/${message.id}`" class="hover:text-red-700 hover:underline">{{ message.subject }}</RouterLink>
                                <span v-else>{{ message.subject }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ message.sender ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ message.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(message)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="messages" :paginator="messages" class="mt-4" @page="fetchMessages" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('messages.create')"
                    to="/messages/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Message
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete message?"
            :message="toDelete ? `${toDelete.subject} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
