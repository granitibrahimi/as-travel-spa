<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import { supplierTransactionPath } from '../../../helpers/supplierTransactions.js';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource, castPaginated } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import InputText from '../../../components/Form/InputText.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import { useNotificationsStore } from '../../../stores/notifications.js';

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();
const id = route.params.id;

const supplier = ref(null);
const title = computed(() => (supplier.value ? `Reconcile: ${supplier.value.name}` : 'Reconcile'));

// Entered amounts, keyed by the transaction composite key "{type}_{id}".
const debitAmounts = reactive({});
const creditAmounts = reactive({});

const debitRows = ref(null);
const creditRows = ref(null);
const debitSearch = ref('');
const creditSearch = ref('');
const debitLoading = ref(false);
const creditLoading = ref(false);

let debitRequest = null;
let creditRequest = null;

const errors = ref([]);
const processing = ref(false);

const selectedDebitKeys = computed(() => Object.keys(debitAmounts).filter((k) => Number(debitAmounts[k]) > 0));
const selectedCreditKeys = computed(() => Object.keys(creditAmounts).filter((k) => Number(creditAmounts[k]) > 0));

const debitTotal = computed(() => selectedDebitKeys.value.reduce((sum, k) => sum + Number(debitAmounts[k]), 0));
const creditTotal = computed(() => selectedCreditKeys.value.reduce((sum, k) => sum + Number(creditAmounts[k]), 0));
const difference = computed(() => Math.round((debitTotal.value - creditTotal.value) * 100) / 100);
const balanced = computed(() => debitTotal.value > 0 && difference.value === 0);

async function fetchSupplier() {
    const { data } = await api.get(`/suppliers/${id}`);
    supplier.value = castResource(data);
}

async function fetchDebit(page = 1) {
    debitRequest?.abort();
    const controller = new AbortController();
    debitRequest = controller;
    debitLoading.value = true;

    try {
        const { data } = await api.get(`/suppliers/${id}/reconcile/debit-transactions`, {
            signal: controller.signal,
            params: {
                search: debitSearch.value || undefined,
                selected_keys: selectedDebitKeys.value.length ? selectedDebitKeys.value : undefined,
                page,
            },
        });
        debitRows.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (debitRequest === controller) {
            debitLoading.value = false;
        }
    }
}

async function fetchCredit(page = 1) {
    creditRequest?.abort();
    const controller = new AbortController();
    creditRequest = controller;
    creditLoading.value = true;

    try {
        const { data } = await api.get(`/suppliers/${id}/reconcile/credit-transactions`, {
            signal: controller.signal,
            params: {
                search: creditSearch.value || undefined,
                selected_keys: selectedCreditKeys.value.length ? selectedCreditKeys.value : undefined,
                page,
            },
        });
        creditRows.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (creditRequest === controller) {
            creditLoading.value = false;
        }
    }
}

function setAmount(amounts, key, value) {
    if (value === '' || value === null || Number(value) <= 0) {
        delete amounts[key];
        return;
    }
    amounts[key] = Number(value);
}

function fill(amounts, row) {
    amounts[row.key] = Math.abs(row.open_amount);
}

async function submit() {
    if (processing.value || ! balanced.value) {
        return;
    }
    processing.value = true;
    errors.value = [];

    try {
        await api.post(`/suppliers/${id}/reconcile`, {
            debit_links: { ...debitAmounts },
            credit_links: { ...creditAmounts },
        });
        notifications.push({ type: 'success', message: 'Transactions reconciled successfully.' });
        router.push(routeUrl('suppliers.show', id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.values(error.response.data.errors ?? {}).flat();
            notifications.push({ type: 'error', message: 'Reconciliation could not be saved.' });
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}

onMounted(() => {
    fetchSupplier();
    fetchDebit();
    fetchCredit();
});
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false" class="mb-6">
            <template #actions>
                <Button variant="primary" size="sm" :disabled="processing || ! balanced" @click="submit">
                    {{ processing ? 'Saving…' : 'Reconcile' }}
                </Button>
            </template>

            <div v-if="errors.length" class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul class="list-inside list-disc space-y-1">
                    <li v-for="(message, i) in errors" :key="i">{{ message }}</li>
                </ul>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="rounded-lg border border-gray-200 p-4">
                    <p class="text-2xl font-bold tabular-nums">{{ money(debitTotal) }}</p>
                    <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">Debit selected</p>
                </div>
                <div class="rounded-lg border border-gray-200 p-4">
                    <p class="text-2xl font-bold tabular-nums">{{ money(creditTotal) }}</p>
                    <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">Credit selected</p>
                </div>
                <div class="rounded-lg border p-4" :class="difference === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'">
                    <p class="text-2xl font-bold tabular-nums">{{ money(difference) }}</p>
                    <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">Difference</p>
                </div>
            </div>
        </FullWidthBox>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <FullWidthBox title="Debit transactions" :collapsible="false">
                <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchDebit()">
                    <div class="w-full sm:w-64">
                        <InputText v-model="debitSearch" label="Search" placeholder="Reference…" />
                    </div>
                    <Button type="submit" variant="primary" size="sm">Search</Button>
                    <Button type="button" size="sm" @click="debitSearch = ''; fetchDebit();">Clear</Button>
                </form>

                <Loader v-if="! debitRows" />

                <template v-else>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b text-left text-gray-500">
                                    <th class="py-2 pr-2">Reference</th>
                                    <th class="py-2 pr-2">Type</th>
                                    <th class="py-2 pr-2">Date</th>
                                    <th class="py-2 pr-2 text-right">Open</th>
                                    <th class="py-2 pl-2 text-right">To reconcile</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in debitRows.data" :key="row.key" class="border-b last:border-0">
                                    <td class="py-2 pr-2">
                                        <RouterLink v-if="supplierTransactionPath(row)" :to="supplierTransactionPath(row)" class="text-red-600 hover:underline">{{ row.reference }}</RouterLink>
                                        <span v-else>{{ row.reference }}</span>
                                    </td>
                                    <td class="py-2 pr-2">{{ row.type }}</td>
                                    <td class="py-2 pr-2">{{ row.date }}</td>
                                    <td class="py-2 pr-2 text-right">
                                        <button type="button" class="tabular-nums text-gray-700 hover:text-red-600 hover:underline" @click="fill(debitAmounts, row)">
                                            {{ money(Math.abs(row.open_amount)) }}
                                        </button>
                                    </td>
                                    <td class="py-2 pl-2 text-right">
                                        <input
                                            type="number" min="0" step="0.01"
                                            class="w-32 rounded border border-gray-300 px-2 py-1 text-right focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                            :value="debitAmounts[row.key] ?? ''"
                                            @input="setAmount(debitAmounts, row.key, $event.target.value)"
                                        >
                                    </td>
                                </tr>
                                <tr v-if="! debitRows.data.length">
                                    <td colspan="5" class="py-6 text-center text-gray-500">No open debit transactions.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <ApiPagination :paginator="debitRows.pagination" class="mt-4" @page="fetchDebit" />
                </template>
            </FullWidthBox>

            <FullWidthBox title="Credit transactions" :collapsible="false">
                <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchCredit()">
                    <div class="w-full sm:w-64">
                        <InputText v-model="creditSearch" label="Search" placeholder="Reference…" />
                    </div>
                    <Button type="submit" variant="primary" size="sm">Search</Button>
                    <Button type="button" size="sm" @click="creditSearch = ''; fetchCredit();">Clear</Button>
                </form>

                <Loader v-if="! creditRows" />

                <template v-else>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b text-left text-gray-500">
                                    <th class="py-2 pr-2">Reference</th>
                                    <th class="py-2 pr-2">Type</th>
                                    <th class="py-2 pr-2">Date</th>
                                    <th class="py-2 pr-2 text-right">Open</th>
                                    <th class="py-2 pl-2 text-right">To reconcile</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in creditRows.data" :key="row.key" class="border-b last:border-0">
                                    <td class="py-2 pr-2">
                                        <RouterLink v-if="supplierTransactionPath(row)" :to="supplierTransactionPath(row)" class="text-red-600 hover:underline">{{ row.reference }}</RouterLink>
                                        <span v-else>{{ row.reference }}</span>
                                    </td>
                                    <td class="py-2 pr-2">{{ row.type }}</td>
                                    <td class="py-2 pr-2">{{ row.date }}</td>
                                    <td class="py-2 pr-2 text-right">
                                        <button type="button" class="tabular-nums text-gray-700 hover:text-red-600 hover:underline" @click="fill(creditAmounts, row)">
                                            {{ money(Math.abs(row.open_amount)) }}
                                        </button>
                                    </td>
                                    <td class="py-2 pl-2 text-right">
                                        <input
                                            type="number" min="0" step="0.01"
                                            class="w-32 rounded border border-gray-300 px-2 py-1 text-right focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                            :value="creditAmounts[row.key] ?? ''"
                                            @input="setAmount(creditAmounts, row.key, $event.target.value)"
                                        >
                                    </td>
                                </tr>
                                <tr v-if="! creditRows.data.length">
                                    <td colspan="5" class="py-6 text-center text-gray-500">No open credit transactions.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <ApiPagination :paginator="creditRows.pagination" class="mt-4" @page="fetchCredit" />
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
