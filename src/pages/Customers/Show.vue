<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../helpers/money';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Select from '../../components/Form/Select.vue';
import InputText from '../../components/Form/InputText.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import CustomerDetails from '../../components/CustomerDetails.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const customer = ref(null);
const stats = ref(null);
const title = computed(() => customer.value?.full_name ?? '');

async function fetchSummary() {
    const { data } = await api.get(`/customers/${id}/summary`);
    stats.value = data.data;
}

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
];

const filters = reactive({ from: '', to: '', status: 'open', entities: [] });

const transactions = ref(null);
const totalAmount = ref(0);
const loadingTransactions = ref(false);
const entityOptions = ref([]);

let transactionsRequest = null;

async function fetchTransactions(page = 1) {
    transactionsRequest?.abort();
    const controller = new AbortController();
    transactionsRequest = controller;
    loadingTransactions.value = true;

    try {
        const { data } = await api.get(`/customers/${id}/transactions`, {
            signal: controller.signal,
            params: {
                from: filters.from || undefined,
                to: filters.to || undefined,
                status: filters.status,
                entities: filters.entities.length ? filters.entities : undefined,
                page,
            },
        });
        transactions.value = { data: data.data, ...data.meta };
        totalAmount.value = data.total_amount;
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (transactionsRequest === controller) {
            loadingTransactions.value = false;
        }
    }
}

onMounted(async () => {
    const { data } = await api.get(`/customers/${id}`);
    customer.value = data.data;

    filters.from = customer.value.transaction_filters.from;
    filters.to = customer.value.transaction_filters.to;
    entityOptions.value = customer.value.transaction_filters.entities;

    fetchSummary();
    await fetchTransactions();
});

watch(filters, () => {
    if (customer.value) {
        fetchTransactions();
    }
});
</script>

<template>
    <AppLayout :title="title ? `Customer: ${title}` : 'Customer'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="title ? `Customer: ${title}` : 'Customer'" :collapsible="false">
                <Loader v-if="! customer" />

                <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <CustomerDetails :customer="customer" />

                    <Loader v-if="! stats" />

                    <div v-else class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="rounded-lg border p-4" :class="stats.open_balance > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'">
                                <p class="text-2xl font-bold tabular-nums">{{ money(stats.open_balance) }}</p>
                                <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">Open balance</p>
                            </div>
                            <div class="rounded-lg border p-4" :class="stats.overdue_balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'">
                                <p class="text-2xl font-bold tabular-nums">{{ money(stats.overdue_balance) }}</p>
                                <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">Overdue payment</p>
                            </div>
                        </div>

                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <tbody>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open payments</th>
                                    <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(stats.open_payments_amount) }}</td>
                                </tr>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open credit notes</th>
                                    <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(stats.open_credit_notes_amount) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <template #footer>
                    <RouterLink to="/customers" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Back to list
                    </RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox title="List of all transactions" :collapsible="false">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <InputText v-model="filters.from" type="date" label="From date" />
                    <InputText v-model="filters.to" type="date" label="To date" />
                    <Select v-model="filters.status" :options="statusOptions" label="Type" :placeholder="null" />
                </div>

                <div class="mt-3 flex flex-wrap gap-4">
                    <label v-for="entity in entityOptions" :key="entity.value" class="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                        <input v-model="filters.entities" type="checkbox" :value="entity.value">
                        {{ entity.label }}
                    </label>
                </div>

                <div class="mt-4 overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Type</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Balance</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Created by</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingTransactions || ! transactions">
                                <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="transactions.data.length === 0">
                                <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No transactions found.</td>
                            </tr>
                            <template v-if="! loadingTransactions && transactions">
                                <tr v-for="transaction in transactions.data" :key="`${transaction.type}-${transaction.id}`" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ transaction.date }}</td>
                                    <td class="border border-gray-300 px-2 py-2 font-medium">{{ transaction.id }} | {{ transaction.reference }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ transaction.type }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transaction.open_amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transaction.amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2">
                                        <span v-if="transaction.is_closed" class="text-green-600">✓</span>
                                        {{ transaction.status }}
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ transaction.user }}</td>
                                </tr>
                                <tr v-if="transactions.data.length > 0" class="bg-gray-50 font-semibold">
                                    <td colspan="3" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                                    <td class="border border-gray-300 px-2 py-2" />
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totalAmount) }}</td>
                                    <td colspan="2" class="border border-gray-300 px-2 py-2" />
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="transactions" :paginator="transactions" class="mt-4" @page="fetchTransactions" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
