<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import StatCard from '../../../components/StatCard.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const customer = ref(null);
const stats = ref(null);
const invoices = ref(null);
const loading = ref(false);

const from = ref('');
const to = ref('');

let request = null;

async function fetchCustomer() {
    const { data } = await api.get(`/customers/customers/${id}`);
    customer.value = data.data;
}

async function fetchStatistics(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get(`/customers/customers/${id}/statistics`, {
            signal: controller.signal,
            params: {
                from: from.value || undefined,
                to: to.value || undefined,
                page,
            },
        });
        stats.value = data.stats;
        invoices.value = castPaginated(data);
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

onMounted(() => {
    fetchCustomer();
    fetchStatistics();
});
</script>

<template>
    <AppLayout :title="customer ? `Statistics: ${customer.full_name}` : 'Statistics'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="customer ? `Statistics: ${customer.full_name}` : 'Statistics'" :collapsible="false">
                <template #actions>
                    <RouterLink :to="routeUrl('customers.show', id)" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                        Back to customer
                    </RouterLink>
                </template>

                <div class="flex flex-wrap items-end gap-3">
                    <DateInput v-model="from" label="From" />
                    <DateInput v-model="to" label="To" />
                    <Button type="button" variant="primary" :loading="loading" @click="fetchStatistics()">Apply</Button>
                    <Button type="button" @click="from = ''; to = ''; fetchStatistics();">Clear</Button>
                </div>
            </FullWidthBox>

            <Loader v-if="! stats && loading" />

            <template v-else-if="stats">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Total sales" :value="stats.total" :format="money" animate />
                    <StatCard label="Total SVC" :value="stats.total_svc" :format="money" animate />
                    <StatCard accent label="Total debt" :value="stats.total_debt" :format="money" animate />
                    <StatCard label="Invoices" :value="stats.invoices_count" animate />
                    <StatCard label="Credit notes" :value="stats.credit_notes_count" animate />
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FullWidthBox title="Top destinations" :collapsible="false">
                        <ul v-if="stats.top_destinations.length" class="divide-y divide-gray-100 text-sm">
                            <li v-for="(d, i) in stats.top_destinations" :key="i" class="flex justify-between py-1.5">
                                <span>{{ d.name ?? '—' }}</span>
                                <span class="tabular-nums text-gray-500">{{ d.count }}</span>
                            </li>
                        </ul>
                        <p v-else class="text-sm text-gray-400">No data.</p>
                    </FullWidthBox>
                    <FullWidthBox title="Top products" :collapsible="false">
                        <ul v-if="stats.top_products.length" class="divide-y divide-gray-100 text-sm">
                            <li v-for="(p, i) in stats.top_products" :key="i" class="flex justify-between py-1.5">
                                <span>{{ p.name ?? '—' }}</span>
                                <span class="tabular-nums text-gray-500">{{ p.count }}</span>
                            </li>
                        </ul>
                        <p v-else class="text-sm text-gray-400">No data.</p>
                    </FullWidthBox>
                </div>

                <FullWidthBox title="Invoices" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">ID</th>
                                    <th class="border border-gray-300 px-2 py-2">Agent</th>
                                    <th class="border border-gray-300 px-2 py-2">Type</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Invoice value</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Paid value</th>
                                    <th class="border border-gray-300 px-2 py-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="loading || ! invoices">
                                    <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                                </tr>
                                <tr v-else-if="invoices.data.length === 0">
                                    <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No invoices found.</td>
                                </tr>
                                <tr v-for="invoice in (loading ? [] : invoices?.data ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 font-medium">
                                        <RouterLink :to="routeUrl('customerInvoices.show', invoice.id)" class="text-red-600 hover:underline">{{ invoice.id }} | {{ invoice.reference }}</RouterLink>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.agent ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ invoice.type ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.paid_amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ invoice.date }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <ApiPagination v-if="invoices" :paginator="invoices.pagination" class="mt-4" @page="fetchStatistics" />
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
