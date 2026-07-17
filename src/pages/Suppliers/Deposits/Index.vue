<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const router = useRouter();

const deposits = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchDeposits(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/supplier-deposits', { params: { q: search.value || undefined, page } });
        deposits.value = { data: data.data, ...data.pagination };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchDeposits());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-deposits/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchDeposits(deposits.value?.current_page ?? 1);
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
        const { data } = await api.post(`/supplier-deposits/${toConvert.value.id}/convert-to-payment`);
        router.push(`/supplier-payments/${data.id}`);
    } finally {
        converting.value = false;
    }
}

const rowActions = (deposit) => [
    ...(auth.can('supplierDeposits.show') ? [{ label: 'View', href: `/supplier-deposits/${deposit.id}` }] : []),
    ...(auth.can('supplierDeposits.edit') ? [{ label: 'Edit', href: `/supplier-deposits/${deposit.id}/edit` }] : []),
    ...(auth.can('supplierDeposits.convertToPayment') ? [{ label: 'Convert to payment', action: () => (toConvert.value = deposit) }] : []),
    ...(auth.can('supplierDeposits.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = deposit) }] : []),
];
</script>

<template>
    <AppLayout title="Supplier Deposits" fluid>
        <FullWidthBox title="Supplier Deposits" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchDeposits()">
                <input v-model="search" type="text" placeholder="Gen ID, transaction #, reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchDeposits();">Clear</button>
            </form>

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
                        <tr v-if="loading || ! deposits">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="deposits.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No deposits found.</td>
                        </tr>
                        <tr v-for="deposit in (loading ? [] : deposits?.data ?? [])" :key="deposit.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/supplier-deposits/${deposit.id}`" class="text-red-600 hover:underline">{{ deposit.gen_id }}</RouterLink>
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

            <ApiPagination v-if="deposits" :paginator="deposits" class="mt-4" @page="fetchDeposits" />
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
