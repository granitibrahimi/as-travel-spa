<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { q: '', date_from: '', date_to: '' },
    async (params, { signal }) => castPaginated((await api.get('/finance/bank-deposits', { params, signal })).data),
);
const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/finance/bank-deposits/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (deposit) => [
    ...(auth.can('bankDeposits.show') ? [{ label: 'View', href: routeUrl('bankDeposits.show', deposit.id) }] : []),
    ...(auth.can('accountTransactions.journal') ? [{ label: 'Journal', to: { name: 'accountTransactions.journal', params: { type: 'bank-deposit', reference: deposit.id } } }] : []),
    ...(deposit.qb_id ? [{ label: 'Open in QuickBooks', href: `https://qbo.intuit.com/app/transfer?txnId=${deposit.qb_id}` }] : []),
    ...(auth.can('bankDeposits.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = deposit) }] : []),
];
</script>

<template>
    <AppLayout title="Bank Deposits" fluid>
        <FullWidthBox title="Bank Deposits" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-3" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Deposit ID or amount…" />
                    <DateInput v-model="filters.date_from" label="Date from" />
                    <DateInput v-model="filters.date_to" label="Date to" />
                    <div class="flex items-end gap-2 md:col-span-3">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Bank account</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No bank deposits found.</td>
                        </tr>
                        <tr v-for="deposit in (loading ? [] : apiResponse?.data ?? [])" :key="deposit.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ deposit.id}} | {{ deposit.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.payment_method }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(deposit.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ deposit.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(deposit)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />

            <template #footer>
                <RouterLink v-if="auth.can('bankDeposits.create')" :to="routeUrl('bankDeposits.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Bank Deposit
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete bank deposit?"
            :message="toDelete ? `${toDelete.gen_id} will be deleted and the linked payments returned to undeposited.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
