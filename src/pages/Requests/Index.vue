<script setup>
import SourceIcon from './SourceIcon.vue';
import SpamBadge from './SpamBadge.vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castPaginated, castResource } from '../../types/responses.js';
import { useListFilters } from '../../composables/useListFilters.js';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import FiltersButton from '../../components/FiltersButton.vue';
import FiltersPanel from '../../components/FiltersPanel.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';
import { requestStatusClass } from './statusClass.js';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage } = useListFilters(
    { q: '', status: 'active', assigned_to: '', spam: '', mine: false },
    async (params, { signal }) => castPaginated((await api.get('/simple-tasks', { params, signal })).data),
);

const options = ref({ statuses: [], sources: [], agents: [] });

onMounted(async () => {
    const { data } = await api.get('/simple-tasks/options');
    options.value = castResource(data);
});

const statusOptions = computed(() => [
    { value: 'active', label: 'Active (not finished)' },
    { value: 'finished', label: 'Finished' },
    ...options.value.statuses.map((s) => ({ value: String(s.id), label: s.name })),
]);

const agentOptions = computed(() => [
    { value: 'none', label: 'Not assigned' },
    ...options.value.agents.map((a) => ({ value: String(a.id), label: a.name })),
]);

const rowActions = (task) => [
    { label: 'View', href: routeUrl('simpleTasks.show', task.id) },
];
</script>

<template>
    <AppLayout title="Requests" fluid>
        <FullWidthBox title="Requests" :collapsible="false">
            <template #actions>
                <RouterLink v-if="auth.can('simpleTasks.dashboard')" :to="routeUrl('simpleTasks.dashboard')" class="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Board view</RouterLink>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Customer, contact or #id" />
                    <Select v-model="filters.status" label="Status" :options="statusOptions" placeholder="All" />
                    <Select
                        v-if="auth.can('simpleTasks.listAll')"
                        v-model="filters.assigned_to"
                        label="Agent"
                        :options="agentOptions"
                        placeholder="All"
                    />
                    <Select
                        v-model="filters.spam"
                        label="Spam"
                        :options="[{ value: '0', label: 'Hide spam' }, { value: '1', label: 'Only spam' }]"
                        placeholder="All"
                    />
                    <div class="flex items-end pb-2">
                        <NiceCheckbox v-model="filters.mine" label="Assigned to me" />
                    </div>
                    <div class="flex items-end gap-2 md:col-span-4">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Contact</th>
                            <th class="border border-gray-300 px-2 py-2">Source</th>
                            <th class="border border-gray-300 px-2 py-2">Destinations</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2">Assigned to</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 140px;">Created</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No requests found.</td>
                        </tr>
                        <tr v-for="task in (loading ? [] : apiResponse?.data ?? [])" :key="task.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ task.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('simpleTasks.show', task.id)" class="text-red-600 hover:underline">{{ task.customer_name }}</RouterLink>
                                <span v-if="task.urgent" class="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Urgent</span>
                                <SpamBadge v-if="task.spam" class="ml-2" />
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ task.customer_contact ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2"><span class="inline-flex items-center gap-2"><SourceIcon :source="task.source" badge />{{ task.source.name }}</span></td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span v-if="task.combo" class="mr-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">Combo</span>
                                {{ (task.parent_destinations ?? []).map((d) => d.name).join(', ') || task.parent_destination?.name || '—' }}<span v-if="task.specific_hotel" class="text-gray-500"> · {{ task.specific_hotel }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="requestStatusClass(task.status)">{{ task.status.name }}</span>
                                <span v-if="task.offers_count" class="mt-1 block text-[11px] text-green-700">{{ task.offers_count }} {{ task.offers_count === 1 ? 'offer' : 'offers' }} sent</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ task.assigned_to?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ task.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(task)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('simpleTasks.create')"
                    :to="routeUrl('simpleTasks.create')"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >+ New request</RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
