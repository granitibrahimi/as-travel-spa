<script setup>
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { downloadFile } from '../../../helpers/download.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Select from '../../../components/Form/Select.vue';
import InputText from '../../../components/Form/InputText.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const notifications = useNotificationsStore();
const accountId = route.params.id;

const downloading = ref(false);
// The account-history endpoint validates the dates as Y-m-d (unlike the
// platform-wide d.m.Y convention — see AGENTS.md), so they are plain native
// date inputs rather than the DateInput component.
const { filters, applied, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage } = useListFilters(
    { q: '', type: null, date_from: '', date_to: '' },
    async (params, { signal }) => castPaginated((await api.get(`/finance/accounts/${accountId}/transactions`, { params, signal })).data),
);

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
    { slug: 'customer-gift-card', label: 'Customer Financial Credit Note', route: 'customerGiftCards.show' },
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

// `payee` is `{ id, name, type: 'customer' | 'supplier' }` or null — link the
// name to the party's detail page.
function payeeLink(payee) {
    if (!payee?.id) {
        return null;
    }

    if (payee.type === 'customer') return routeUrl('customers.show', payee.id);
    if (payee.type === 'supplier') return routeUrl('suppliers.show', payee.id);

    return null;
}

// Export the account history to Excel. The endpoint accepts the same optional
// filters as the table; with no date range it exports every posting for the
// account. Sends the applied filters (what's on screen), not half-typed input.
async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;

    try {
        await downloadFile(`/finance/accounts/${accountId}/transactions/excel`, {
            fallbackName: 'account-history.xlsx',
            config: { params: applied.value },
        });
    } catch {
        notifications.push({ type: 'error', message: 'Could not export the account history.' });
    } finally {
        downloading.value = false;
    }
}

const account = computed(() => apiResponse.value?.extra?.account ?? null);
const openingBalance = computed(() => apiResponse.value?.extra?.opening_balance ?? 0);
const closingBalance = computed(() => apiResponse.value?.extra?.closing_balance ?? 0);
</script>

<template>
    <AppLayout :title="account ? `Account History: ${account.full_name}` : 'Account History'" fluid>
        <FullWidthBox :title="account ? account.full_name : 'Account History'" :collapsible="false">
            <template #actions>
                <Button type="button" :loading="downloading" @click="downloadExcel">
                    {{ downloading ? 'Preparing…' : 'Download Excel' }}
                </Button>
                <RouterLink :to="routeUrl('accounts.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to Accounts</RouterLink>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Notes, reference # or amount…" />
                    <Select v-model="filters.type" :options="typeSelectOptions" label="Type" placeholder="All types" />
                    <InputText v-model="filters.date_from" type="date" label="From" />
                    <InputText v-model="filters.date_to" type="date" label="To" />
                    <div class="flex items-end gap-2 md:col-span-4">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

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

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 230px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Payee / Split</th>
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
                            <td class="border border-gray-300 px-2 py-2">
                                <div>
                                    <RouterLink v-if="referenceLink(row)" :to="referenceLink(row)" class="text-red-600 hover:underline">{{ row.type }}</RouterLink>
                                    <span v-else>{{ row.type }}</span>
                                </div>
                                <div v-if="row.reference_label ?? row.reference_id" class="text-xs text-gray-500">{{ row.reference_label ?? row.reference_id }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div v-if="row.payee">
                                    <RouterLink v-if="payeeLink(row.payee)" :to="payeeLink(row.payee)" class="text-red-600 hover:underline">{{ row.payee.name }}</RouterLink>
                                    <span v-else>{{ row.payee.name }}</span>
                                </div>
                                <div v-if="row.split" class="text-xs text-gray-500">
                                    <RouterLink
                                        v-if="! row.split.is_split && row.split.id"
                                        :to="routeUrl('accounts.history', row.split.id)"
                                        class="text-red-600 hover:underline"
                                    >{{ row.split.full_name ?? row.split.name }}</RouterLink>
                                    <span v-else>{{ row.split.full_name ?? row.split.name }}</span>
                                </div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.notes }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.debit ? money(row.debit) : '' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.credit ? money(row.credit) : '' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums font-medium">{{ money(row.balance) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>
    </AppLayout>
</template>
