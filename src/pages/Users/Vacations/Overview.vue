<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

// All filtering is server-side (the endpoint paginates). Submit re-fetches from
// page 1; the paginator keeps the same filters when changing pages.
const filters = reactive({
    userId: null,
    from: '',
    to: '',
    onlyOpen: false,
});

const apiResponse = ref(null);
const loading = ref(false);

let request = null;

const statusClass = (status) => ({
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Open: 'bg-amber-100 text-amber-700',
}[status] ?? 'bg-gray-100 text-gray-600');

async function fetchRequests(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/users/vacations', {
            signal: controller.signal,
            params: {
                page,
                user_id: filters.userId || undefined,
                from: filters.from || undefined,
                to: filters.to || undefined,
                only_open: filters.onlyOpen ? 1 : undefined,
            },
        });
        apiResponse.value = castPaginated(data);
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

onMounted(() => fetchRequests());
</script>

<template>
    <AppLayout title="Vacation requests" fluid>
        <div v-if="auth.can('vacation.viewAllUsers')" class="space-y-6">
            <FullWidthBox title="Filters" :collapsible="false">
                <form
                    class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
                    @submit.prevent="fetchRequests()"
                >
                    <AsyncSelect
                        v-model="filters.userId"
                        url="/users/users/autosuggest"
                        label="Agent"
                        placeholder="All agents"
                    />
                    <DateInput v-model="filters.from" label="From date" />
                    <DateInput v-model="filters.to" label="To date" />
                    <NiceCheckbox v-model="filters.onlyOpen" label="Only open" class="pb-1.5" @update:model-value="fetchRequests()" />
                    <Button type="submit" variant="primary" class="w-full">Filter</Button>
                </form>
            </FullWidthBox>

            <FullWidthBox title="Requests" :collapsible="false">
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

                <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchRequests" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
