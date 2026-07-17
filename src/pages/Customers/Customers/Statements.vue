<script setup>
import { onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money.js';
import { customerTransactionPath } from '../../../helpers/customerTransactions.js';
import api from '../../../helpers/api.js';
import { downloadFile } from '../../../helpers/download.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import StatCard from '../../../components/StatCard.vue';
import Loader from '../../../components/Loader.vue';
import { useNotificationsStore } from '../../../stores/notifications.js';

const route = useRoute();
const notifications = useNotificationsStore();
const id = route.params.id;

// Backend speaks d.m.Y; the date input speaks Y-m-d.

const customer = ref(null);
const types = ref([]);
const entities = ref([]);
const openBalance = ref(0);
const overdueBalance = ref(0);
const transactions = ref(null);
const totals = ref({ open_amount: 0, amount: 0 });

const filters = reactive({ from: '', to: '', type: null, entities: [] });

const loading = ref(false);
const downloadingPdf = ref(false);
const downloadingExcel = ref(false);
const sendingEmail = ref(false);
const initialised = ref(false);

let request = null;

function apiParams() {
    return {
        from_date: filters.from || undefined,
        to_date: filters.to || undefined,
        type: filters.type ?? undefined,
        entities: filters.entities.length ? filters.entities : undefined,
    };
}

async function fetchCustomer() {
    const { data } = await api.get(`/customers/${id}`);
    customer.value = data.data;
}

async function fetchStatements() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get(`/customers/${id}/statements`, {
            signal: controller.signal,
            params: apiParams(),
        });
        const payload = data.data;

        types.value = payload.types;
        entities.value = payload.entities;
        openBalance.value = payload.open_balance;
        overdueBalance.value = payload.overdue_balance;
        transactions.value = payload.transactions;
        totals.value = payload.totals;

        // Seed the form from the server-computed defaults on first load only.
        if (! initialised.value) {
            filters.from = payload.inputs.from_date ?? '';
            filters.to = payload.inputs.to_date ?? '';
            filters.type = payload.inputs.type;
            filters.entities = payload.inputs.entities;
            initialised.value = true;
        }
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

async function download(kind, flag) {
    if (flag.value) {
        return;
    }
    flag.value = true;

    try {
        await downloadFile(`/customers/${id}/statements/${kind}`, {
            fallbackName: `statement.${kind === 'pdf' ? 'pdf' : 'xlsx'}`,
            config: { params: apiParams() },
        });
    } finally {
        flag.value = false;
    }
}

async function sendEmail() {
    if (sendingEmail.value) {
        return;
    }
    sendingEmail.value = true;

    try {
        await api.post(`/customers/${id}/statements/email`, apiParams());
        notifications.push({ type: 'success', message: 'Statement email sent successfully.' });
    } catch {
        notifications.push({ type: 'error', message: 'Could not send the statement email.' });
    } finally {
        sendingEmail.value = false;
    }
}

onMounted(() => {
    fetchCustomer();
    fetchStatements();
});
</script>

<template>
    <AppLayout :title="customer ? `Statement: ${customer.full_name}` : 'Statement'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="customer ? `Statement: ${customer.full_name}` : 'Statement'" :collapsible="false">
                <template #actions>
                    <div class="flex flex-wrap items-center gap-2">
                        <Button size="sm" :loading="sendingEmail" @click="sendEmail">Send email</Button>
                        <Button size="sm" :loading="downloadingExcel" @click="download('excel', downloadingExcel)">Download Excel</Button>
                        <Button size="sm" :loading="downloadingPdf" @click="download('pdf', downloadingPdf)">Download PDF</Button>
                        <RouterLink :to="`/customers/${id}`" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                            Back to customer
                        </RouterLink>
                    </div>
                </template>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <DateInput v-model="filters.from" label="From date" />
                    <DateInput v-model="filters.to" label="To date" />
                    <Select v-model="filters.type" :options="types" label="Type" :placeholder="null" />
                    <div class="flex items-end">
                        <Button type="button" variant="primary" :loading="loading" @click="fetchStatements">Apply</Button>
                    </div>
                </div>

                <div class="mt-3 flex flex-wrap gap-4">
                    <label v-for="entity in entities" :key="entity.value" class="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                        <input v-model="filters.entities" type="checkbox" :value="entity.value">
                        {{ entity.label }}
                    </label>
                </div>
            </FullWidthBox>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard label="Open balance" :value="openBalance" :format="money" animate :accent="openBalance > 0" />
                <StatCard label="Overdue payment" :value="overdueBalance" :format="money" animate :accent="overdueBalance > 0" />
            </div>

            <FullWidthBox title="Transactions" :collapsible="false">
                <Loader v-if="loading" />

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Type</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Balance</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Created by</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="! transactions || transactions.length === 0">
                                <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No transactions for this range.</td>
                            </tr>
                            <tr v-for="transaction in (transactions ?? [])" :key="transaction.key" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ transaction.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink v-if="customerTransactionPath(transaction)" :to="customerTransactionPath(transaction)" class="text-red-600 hover:underline">{{ transaction.id }} | {{ transaction.reference }}</RouterLink>
                                    <span v-else>{{ transaction.id }} | {{ transaction.reference }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ transaction.type }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transaction.open_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transaction.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span v-if="transaction.is_closed" class="text-green-600">✓</span>
                                    {{ transaction.status }}
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ transaction.user ?? '—' }}</td>
                            </tr>
                            <tr v-if="transactions && transactions.length" class="bg-gray-50 font-semibold">
                                <td colspan="3" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.open_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.amount) }}</td>
                                <td colspan="2" class="border border-gray-300 px-2 py-2" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
