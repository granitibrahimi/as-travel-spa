<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Select from '../../../components/Form/Select.vue';
import InputText from '../../../components/Form/InputText.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const accountId = route.params.id;

const apiResponse = ref(null);
const loading = ref(false);
const q = ref('');
const filters = reactive({
    type: '',
    // The account-history endpoint validates these as Y-m-d (unlike the
    // platform-wide d.m.Y convention — see AS Travel SPA CLAUDE.md), so
    // these are plain native date inputs rather than the DateInput component.
    date_from: '',
    date_to: '',
});

// AccountTransactionType slugs this endpoint accepts, paired with the exact
// human label GetAccountTransactionsAction renders in a row's `type` field
// (Modules\Finance\Enums\AccountTransactionType::name()) — reused below to
// route a row's reference link without needing the type's numeric id.
const TYPE_OPTIONS = [
    { slug: 'transfer', label: 'Transfer', route: 'accountTransfers.show' },
    { slug: 'journal', label: 'Journal', route: 'journals.show' },
    { slug: 'expense', label: 'Expense', route: 'expenses.show' },
    { slug: 'bank-deposit', label: 'Bank Deposit', route: 'bankDeposits.show' },
    { slug: 'customer-invoice', label: 'Customer Invoice', route: 'customerInvoices.show' },
    { slug: 'customer-payment', label: 'Customer Payment', route: 'customerPayments.show' },
    { slug: 'customer-refund', label: 'Customer Refund', route: 'customerRefunds.show' },
    { slug: 'customer-credit-note', label: 'Customer CreditNote', route: 'customerCreditNotes.show' },
    { slug: 'customer-gift-card', label: 'Customer GiftCard', route: 'customerGiftCards.show' },
    { slug: 'supplier-bill', label: 'Supplier Bill', route: 'supplierBills.show' },
    { slug: 'supplier-payment', label: 'Supplier Payment', route: 'supplierPayments.show' },
    { slug: 'supplier-credit-note', label: 'Supplier Credit', route: 'supplierCreditNotes.show' },
    { slug: 'supplier-gift-card', label: 'Supplier GiftCard', route: 'supplierGiftCards.show' },
    { slug: 'supplier-deposit', label: 'Supplier Deposit', route: 'supplierDeposits.show' },
    { slug: 'supplier-refund', label: 'Supplier Reimbursement', route: 'supplierRefunds.show' },
];

const typeSelectOptions = TYPE_OPTIONS.map((t) => ({ value: t.slug, label: t.label }));
const routeByLabel = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.label, t.route]));

// A row's `reference_url` is the platform API path (not a usable SPA route) —
// this maps its `type` label + `reference_id` onto our own show route
// instead. Falls back to plain text when a type has no SPA show page.
function referenceLink(row) {
    const name = routeByLabel[row.type];

    return name ? routeUrl(name, row.reference_id) : null;
}

let request = null;

async function fetchTransactions(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get(`/finance/accounts/${accountId}/transactions`, {
            signal: controller.signal,
            params: {
                q: q.value || undefined,
                type: filters.type || undefined,
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

onMounted(() => fetchTransactions());

// Nothing refetches on change: every filter (search, type, date range) is
// applied together only when the Filter button submits the form.

const account = computed(() => apiResponse.value?.extra?.account ?? null);
const openingBalance = computed(() => apiResponse.value?.extra?.opening_balance ?? 0);
const closingBalance = computed(() => apiResponse.value?.extra?.closing_balance ?? 0);
</script>

<template>
    <AppLayout :title="account ? `Account History: ${account.full_name}` : 'Account History'" fluid>
        <FullWidthBox :title="account ? account.full_name : 'Account History'" :collapsible="false">
            <template #actions>
                <RouterLink :to="routeUrl('accounts.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to Accounts</RouterLink>
            </template>

            <div v-if="account" class="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <div class="text-xs uppercase text-gray-500">Account</div>
                    <div class="font-medium">{{ account.number }} — {{ account.name }}</div>
                </div>
                <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <div class="text-xs uppercase text-gray-500">Opening balance</div>
                    <div class="font-medium tabular-nums">{{ money(openingBalance) }}</div>
                </div>
                <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <div class="text-xs uppercase text-gray-500">Closing balance</div>
                    <div class="font-medium tabular-nums">{{ money(closingBalance) }}</div>
                </div>
            </div>

            <form class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="fetchTransactions()">
                <input v-model="q" type="text" placeholder="Notes or reference #…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                <Select v-model="filters.type" :options="typeSelectOptions" placeholder="All types" />
                <InputText v-model="filters.date_from" type="date" label="From" />
                <InputText v-model="filters.date_to" type="date" label="To" />
                <div>
                    <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                </div>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Reference</th>
                            <th class="border border-gray-300 px-2 py-2">Notes</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Debit</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Credit</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No transactions found.</td>
                        </tr>
                        <tr v-for="row in (loading ? [] : apiResponse?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.type }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="referenceLink(row)" :to="referenceLink(row)" class="text-red-600 hover:underline">{{ row.reference_id }}</RouterLink>
                                <span v-else>{{ row.reference_id }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.notes ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.debit ? money(row.debit) : '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.credit ? money(row.credit) : '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums font-medium">{{ money(row.balance) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchTransactions" />
        </FullWidthBox>
    </AppLayout>
</template>
