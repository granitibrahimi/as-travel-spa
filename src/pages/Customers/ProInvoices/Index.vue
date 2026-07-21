<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);

const filters = reactive({ q: '' });

let request = null;

async function fetchProInvoices(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/customers/pro-invoices', {
            signal: controller.signal,
            params: { q: filters.q || undefined, page },
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

function clearFilters() {
    filters.q = '';
    fetchProInvoices();
}

onMounted(fetchProInvoices);

// Flight/hotel info are multi-line free text; show a single trimmed line and
// keep the full value in the title tooltip.
const oneLine = (value) => (value ? value.replace(/\s+/g, ' ').trim() : '');

const rowActions = (row) => [
    ...(auth.can('customerProInvoices.show') ? [{ label: 'View', href: routeUrl('customerProInvoices.show', row.id) }] : []),
    ...(auth.can('customerProInvoices.edit') ? [{ label: 'Edit', href: routeUrl('customerProInvoices.edit', row.id) }] : []),
];
</script>

<template>
    <AppLayout title="Pro Invoices" fluid>
        <FullWidthBox title="Pro Invoices" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchProInvoices()">
                <InputText v-model="filters.q" label="Search" placeholder="Pro-invoice ID, customer…" class="w-full sm:w-72" />
                <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                <Button type="button" @click="clearFilters">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Flight info</th>
                            <th class="border border-gray-300 px-2 py-2">Hotel info</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 150px;">Created at</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No pro-invoices found.</td>
                        </tr>
                        <tr v-for="row in (loading ? [] : apiResponse?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">
                                <RouterLink :to="routeUrl('customerProInvoices.show', row.id)" class="text-red-700 hover:underline">{{ row.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.customer?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                            <td class="max-w-[16rem] truncate border border-gray-300 px-2 py-2 text-gray-600" :title="oneLine(row.flight_info)">{{ oneLine(row.flight_info) || '—' }}</td>
                            <td class="max-w-[16rem] truncate border border-gray-300 px-2 py-2 text-gray-600" :title="oneLine(row.hotel_info)">{{ oneLine(row.hotel_info) || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.user?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-500">{{ row.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(row)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchProInvoices" />
        </FullWidthBox>
    </AppLayout>
</template>
