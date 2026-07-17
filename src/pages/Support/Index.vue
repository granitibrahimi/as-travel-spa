<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const tickets = ref(null);
const loading = ref(false);
const filter = ref('all');

const filters = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'working', label: 'Working on it' },
    { key: 'resolved', label: 'Resolved' },
];

async function fetchTickets(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/support-tickets', {
            params: { status: filter.value === 'all' ? undefined : filter.value, page },
        });
        tickets.value = { data: data.data, ...data.pagination };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchTickets());

function setFilter(key) {
    filter.value = key;
    fetchTickets();
}

const statusClass = (status) => ({
    1: 'bg-red-100 text-red-700',
    2: 'bg-amber-100 text-amber-700',
    3: 'bg-green-100 text-green-700',
}[status] ?? 'bg-gray-100 text-gray-600');

const rowActions = (ticket) => [
    { label: 'View', href: `/support/${ticket.id}` },
];
</script>

<template>
    <AppLayout title="Support Tickets" fluid>
        <FullWidthBox title="Support Tickets" :collapsible="false">
            <div class="mb-4 flex flex-wrap gap-2">
                <button
                    v-for="f in filters"
                    :key="f.key"
                    type="button"
                    class="rounded-full border px-3 py-1 text-sm"
                    :class="filter === f.key ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                    @click="setFilter(f.key)"
                >
                    {{ f.label }}
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Title</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 130px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2">Opened by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Comments</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 140px;">Created</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! tickets">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="tickets.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No tickets found.</td>
                        </tr>
                        <tr v-for="ticket in (loading ? [] : tickets?.data ?? [])" :key="ticket.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ ticket.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/support/${ticket.id}`" class="text-red-600 hover:underline">{{ ticket.title }}</RouterLink>
                                <span v-if="ticket.has_attachment" class="ml-1 text-xs text-gray-400">📎</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(ticket.status)">{{ ticket.status_label }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ ticket.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ ticket.comments_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ ticket.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(ticket)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="tickets" :paginator="tickets" class="mt-4" @page="fetchTickets" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('supportTickets.create')"
                    to="/support/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >+ New ticket</RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
