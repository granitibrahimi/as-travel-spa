<script setup>
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated, castMutation } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import InputText from '../../../components/Form/InputText.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

const auth = useAuthStore();
const router = useRouter();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { q: '', supplier_id: null, supplier_name: '' },
    async (params, { signal }) => castPaginated((await api.get('/suppliers/deposits', { params, signal })).data),
    // The supplier's name rides along in the URL so the picker can show it again on Back.
    { urlOnly: ['supplier_name'] },
);

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/suppliers/deposits/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

// Convert with a confirm dialog — it creates a payment and routes to it.
const toConvert = ref(null);
const converting = ref(false);

async function confirmConvert() {
    if (converting.value) {
        return;
    }

    converting.value = true;

    try {
        const { data } = await api.post(`/suppliers/deposits/${toConvert.value.id}/convert-to-payment`);
        router.push(routeUrl('supplierPayments.show', castMutation(data).id));
    } finally {
        converting.value = false;
    }
}

const rowActions = (deposit) => [
    ...(auth.can('supplierDeposits.show') ? [{ label: 'View', href: routeUrl('supplierDeposits.show', deposit.id) }] : []),
    ...(auth.can('supplierDeposits.edit') ? [{ label: 'Edit', href: routeUrl('supplierDeposits.edit', deposit.id) }] : []),
    ...(auth.can('supplierDeposits.convertToPayment') ? [{ label: 'Convert to payment', action: () => (toConvert.value = deposit) }] : []),
    ...(auth.can('supplierDeposits.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = deposit) }] : []),
];
</script>

<template>
    <AppLayout title="Supplier Deposits" fluid>
        <FullWidthBox title="Supplier Deposits" :collapsible="false">
            <template #actions>
                <span class="text-sm text-gray-500">Total:</span>
                <span class="font-semibold tabular-nums">{{ money(apiResponse?.extra?.total_amount ?? 0) }}</span>
                <FiltersButton v-model="showFilters" :count="activeCount" class="ml-2" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-3" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Gen ID, transaction #, reference…" />
                    <!-- AsyncSelect only reads initialOption on mount, so re-key it whenever the value changes (restore/clear). -->
                    <AsyncSelect
                        :key="filters.supplier_id ?? 'none'"
                        v-model="filters.supplier_id"
                        label="Supplier"
                        url="/suppliers/suppliers/autosuggest"
                        placeholder="All suppliers"
                        :initial-option="filters.supplier_id ? { name: filters.supplier_name } : null"
                        @change="(option) => (filters.supplier_name = option?.label ?? '')"
                    />
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
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No deposits found.</td>
                        </tr>
                        <tr v-for="deposit in (loading ? [] : apiResponse?.data ?? [])" :key="deposit.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('supplierDeposits.show', deposit.id)" class="text-red-600 hover:underline">{{ deposit.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(deposit.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.payment_method ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ deposit.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(deposit)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete deposit?"
            :message="toDelete ? `Deposit ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />

        <ConfirmDialog
            :show="Boolean(toConvert)"
            title="Convert deposit to payment?"
            :message="toConvert ? `Deposit ${toConvert.gen_id} will be converted into a supplier payment.` : ''"
            confirm-label="Yes, convert"
            :processing="converting"
            @confirm="confirmConvert"
            @cancel="toConvert = null"
        />
    </AppLayout>
</template>
