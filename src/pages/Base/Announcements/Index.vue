<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const router = useRouter();

const announcements = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);
const claiming = ref(null);

const badgeClass = {
    info: 'bg-sky-100 text-sky-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
};

let request = null;

async function fetchAnnouncements(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/announcements', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        // Resource collection envelope: rows in `data`, paginator in `meta`.
        announcements.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchAnnouncements());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/announcements/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchAnnouncements(announcements.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

async function claim(announcement) {
    if (claiming.value) {
        return;
    }

    claiming.value = announcement.id;

    try {
        await api.post(`/announcements/${announcement.id}/claim`);
        await fetchAnnouncements(announcements.value?.current_page ?? 1);
    } finally {
        claiming.value = null;
    }
}

const rowActions = (announcement) => [
    ...(auth.can('announcements.statistics') ? [{ label: 'Statistics', action: () => router.push(`/announcements/${announcement.id}/statistics`) }] : []),
    ...(auth.can('announcements.edit') ? [{ label: 'Edit', action: () => router.push(`/announcements/${announcement.id}/edit`) }] : []),
    ...(auth.can('announcements.claim') && ! announcement.is_claimed ? [{ label: 'Claim', action: () => claim(announcement) }] : []),
    ...(auth.can('announcements.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = announcement) }] : []),
];
</script>

<template>
    <AppLayout title="Announcements" fluid>
        <FullWidthBox title="Announcements" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchAnnouncements()">
                <input v-model="search" type="text" placeholder="Search…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <button type="submit" class="inline-flex items-center justify-center rounded bg-red-600 px-4 py-1.5 text-base text-white hover:bg-red-700">Search</button>
                <button type="button" class="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-4 py-1.5 text-base hover:bg-gray-50" @click="search = ''; fetchAnnouncements();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Title</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Priority</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2">Claimed by</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 140px;">Created</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! announcements">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="announcements.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No announcements found.</td>
                        </tr>
                        <tr v-for="announcement in (loading ? [] : announcements?.data ?? [])" :key="announcement.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ announcement.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ announcement.title }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="badgeClass[announcement.priority_class]">
                                    {{ announcement.priority_label }}
                                </span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ announcement.created_by ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ announcement.assigned_to ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ announcement.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(announcement)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="announcements" :paginator="announcements" class="mt-4" @page="fetchAnnouncements" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('announcements.create')"
                    to="/announcements/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Announcement
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete announcement?"
            :message="toDelete ? `${toDelete.title} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
