<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { q: '', date_from: '', date_to: '', open: false },
    async (params, { signal }) => castPaginated((await api.get('/suppliers/credit-notes', { params, signal })).data),
);

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/suppliers/credit-notes/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

// View / Delete / QB / Journal — the ⋯ dropdown, mirroring
// Suppliers/Bills/Index.vue (Edit lives on the show page's actions overlay).
// QB uses `qb_link` from the list endpoint.
const rowActions = (creditNote) => [
    ...(auth.can('supplierCreditNotes.show') ? [{ label: 'View', href: routeUrl('supplierCreditNotes.show', creditNote.id) }] : []),
    ...(auth.can('supplierCreditNotes.delete')
        ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = creditNote) }]
        : []),
    ...(creditNote.qb_link ? [{ label: 'QB', href: creditNote.qb_link }] : []),
    ...(auth.can('accountTransactions.journal')
        ? [{ label: 'Journal', href: `/finance/account-transactions/journal/supplier-credit-note/${creditNote.id}` }]
        : []),
];
</script>

<template>
    <AppLayout title="Supplier Credit Notes" fluid>
        <FullWidthBox v-if="auth.can('supplierCreditNotes.list')" title="Credit Notes" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Credit note ID, reference…" />
                    <DateInput v-model="filters.date_from" label="Date from" />
                    <DateInput v-model="filters.date_to" label="Date to" />
                    <div class="flex items-end">
                        <NiceCheckbox v-model="filters.open" label="Open only" />
                    </div>
                    <div class="flex items-end gap-2 md:col-span-4">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Credit note</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Paid</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Open</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No credit notes found.</td>
                        </tr>
                        <tr v-for="creditNote in (loading ? [] : apiResponse?.data ?? [])" :key="creditNote.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('supplierCreditNotes.show', creditNote.id)" class="text-red-700 hover:underline">{{ creditNote.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ creditNote.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ creditNote.reference ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(creditNote.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(creditNote.paid_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums" :class="creditNote.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(creditNote.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(creditNote)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete credit note?"
            :message="toDelete ? `Credit note ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
