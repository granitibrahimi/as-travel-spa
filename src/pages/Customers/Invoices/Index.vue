<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api, {getUsersAutosuggestEndpoint} from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import InvoiceActions from './Actions.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);

// Date inputs speak Y-m-d; the API expects d.m.Y (see helpers/date.js).
const filters = reactive({
    q: '',
    agent: null,
    date_from: '',
    date_to: '',
});

let request = null;

async function fetchInvoices(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/customers/invoices', {
            signal: controller.signal,
            params: {
                q: filters.q || undefined,
                agent: filters.agent || undefined,
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

            console.log(apiResponse);
        }
    }
}

function clearFilters() {
    filters.q = '';
    filters.agent = null;
    filters.date_from = '';
    filters.date_to = '';
    fetchInvoices();
}

onMounted(fetchInvoices);

// Actions side overlay for the row picked via the ⋯ button.
const selected = ref(null);

// After a delete from the actions overlay, refresh the current page.
function onInvoiceDeleted() {
    selected.value = null;
    fetchInvoices(apiResponse.value?.pagination?.current_page ?? 1);
}
</script>

<template>
    <AppLayout title="Invoices" fluid>
        <FullWidthBox v-if="auth.canAny(['customerInvoices.listAll', 'customerInvoices.listOwn'])" title="Invoices" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="fetchInvoices()">
                <InputText v-model="filters.q" label="Search" placeholder="Invoice ID, ticket, customer…" />
                <AsyncSelect v-model="filters.agent" :url="getUsersAutosuggestEndpoint()" label="Agent" placeholder="All agents" v-if="auth.can('customerInvoices.listFilterByAgent')" />
                <DateInput v-model="filters.date_from" label="Date from" />
                <DateInput v-model="filters.date_to" label="Date to" />
                <div class="flex items-end gap-2 md:col-span-4">
                    <Button type="submit" variant="primary" :loading="loading" @click="apply">Filter</Button>
                    <Button type="button" @click="clearFilters">Clear</Button>
                </div>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Invoice</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Destination</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Agent</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Paid</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No invoices found.</td>
                        </tr>
                        <tr v-for="invoice in (loading ? [] : apiResponse?.data ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('customerInvoices.show', invoice.id)" class="text-red-700 hover:underline">{{ invoice.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ invoice.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ invoice.customer.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.destination ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.user.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.paid_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Invoice actions"
                                    @click="selected = invoice"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="1.8" />
                                        <circle cx="12" cy="12" r="1.8" />
                                        <circle cx="12" cy="19" r="1.8" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchInvoices" />
        </FullWidthBox>

        <!-- Per-invoice actions — defined locally and permission-gated (Actions.vue). -->
        <InvoiceActions
            :invoice="selected"
            :show="Boolean(selected)"
            @close="selected = null"
            @deleted="onInvoiceDeleted"
        />
    </AppLayout>
</template>
