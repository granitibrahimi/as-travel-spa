<script setup>
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage } = useListFilters(
    { user_id: null, user_name: '', from: '', to: '', only_open: false },
    async (params, { signal }) => castPaginated((await api.get('/users/vacations', { params, signal })).data),
    // The agent's name rides along in the URL so the picker can show it again on Back.
    { urlOnly: ['user_name'] },
);

const statusClass = (status) => ({
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Open: 'bg-amber-100 text-amber-700',
}[status] ?? 'bg-gray-100 text-gray-600');

</script>

<template>
    <AppLayout title="Vacation requests" fluid>
        <div v-if="auth.can('vacation.viewAllUsers')" class="space-y-6">
            <FullWidthBox title="Requests" :collapsible="false">
                <template #actions>
                    <FiltersButton v-model="showFilters" :count="activeCount" />
                </template>

                <FiltersPanel :open="showFilters">
                    <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                        <!-- AsyncSelect only reads initialOption on mount, so re-key it whenever the value changes (restore/clear). -->
                        <AsyncSelect
                            :key="filters.user_id ?? 'none'"
                            v-model="filters.user_id"
                            url="/users/users/autosuggest"
                            label="Agent"
                            placeholder="All agents"
                            :initial-option="filters.user_id ? { name: filters.user_name } : null"
                            @change="(option) => (filters.user_name = option?.label ?? '')"
                        />
                        <DateInput v-model="filters.from" label="From date" />
                        <DateInput v-model="filters.to" label="To date" />
                        <div class="flex items-end">
                            <NiceCheckbox v-model="filters.only_open" label="Only open" />
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
                                <th class="border border-gray-300 px-2 py-2" style="width: 70px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">User</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">From</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">To</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Days</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Applied at</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! apiResponse">
                                <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="apiResponse.data.length === 0">
                                <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No requests found.</td>
                            </tr>
                            <tr v-for="row in (loading ? [] : apiResponse?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.user ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.type_label }}</td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.from }}</td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.to }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ row.working_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span class="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide" :class="statusClass(row.status_label)">{{ row.status_label }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-600">{{ row.applied_at ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <RouterLink v-if="auth.can('vacations.showRequest')" :to="routeUrl('vacations.show', row.id)" class="text-red-700 hover:underline">Open</RouterLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
