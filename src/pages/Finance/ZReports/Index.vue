<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const filters = reactive({
    q: '',
    date_from: '',
    date_to: '',
});

const apiResponse = ref(null);
const loading = ref(false);
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchReports(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/z-reports', {
            signal: controller.signal,
            params: {
                q: filters.q || undefined,
                date_from: filters.date_from || undefined,
                date_to: filters.date_to || undefined,
                page,
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

function clear() {
    filters.q = '';
    filters.date_from = '';
    filters.date_to = '';
    fetchReports();
}

onMounted(() => fetchReports());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/z-reports/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchReports(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (report) => [
    ...(auth.can('zReports.show') ? [{ label: 'View', href: routeUrl('zReports.show', report.id) }] : []),
    ...(auth.can('zReports.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = report) }] : []),
];
</script>

<template>
    <AppLayout title="Z-Reports" fluid>
        <FullWidthBox title="Z-Reports" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="fetchReports()">
                <InputText v-model="filters.q" label="Search" placeholder="Report ID…" />
                <DateInput v-model="filters.date_from" label="Date from" />
                <DateInput v-model="filters.date_to" label="Date to" />
                <div class="flex items-end gap-2">
                    <Button type="submit" variant="primary">Filter</Button>
                    <Button type="button" @click="clear">Clear</Button>
                </div>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Report</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Difference</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No Z-Reports found.</td>
                        </tr>
                        <tr v-for="report in (loading ? [] : apiResponse?.data ?? [])" :key="report.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ report.report_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ report.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.difference) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ report.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(report)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchReports" />

            <template #footer>
                <RouterLink v-if="auth.can('zReports.create')" :to="routeUrl('zReports.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Z-Report
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete Z-Report?"
            :message="toDelete ? `${toDelete.report_id} will be deleted and its invoices unlinked.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
