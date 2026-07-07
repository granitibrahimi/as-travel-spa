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
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const router = useRouter();

const payments = ref(null);
const loading = ref(false);
const search = ref('');
const openOnly = ref(false);

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/supplier-payments', {
            params: {
                q: search.value || undefined,
                open: openOnly.value ? 1 : undefined,
                page,
            },
        });
        payments.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchPayments());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-payments/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchPayments(payments.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

// Convert with a confirm dialog — it creates a deposit and routes to it.
const toConvert = ref(null);
const converting = ref(false);

async function confirmConvert() {
    if (converting.value) {
        return;
    }

    converting.value = true;

    try {
        const { data } = await api.post(`/supplier-payments/${toConvert.value.id}/convert-to-deposit`);
        router.push(`/supplier-deposits/${data.id}`);
    } finally {
        converting.value = false;
    }
}

const rowActions = (payment) => [
    ...(auth.can('supplierPayments.show') ? [{ label: 'View', href: `/supplier-payments/${payment.id}` }] : []),
    ...(auth.can('supplierPayments.edit') ? [{ label: 'Edit', href: `/supplier-payments/${payment.id}/edit` }] : []),
    ...(auth.can('supplierPayments.convertToDeposit') ? [{ label: 'Convert to deposit', action: () => (toConvert.value = payment) }] : []),
    ...(auth.can('supplierPayments.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = payment) }] : []),
];
</script>

<template>
    <AppLayout title="Supplier Payments" fluid>
        <FullWidthBox title="Supplier Payments" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchPayments()">
                <input v-model="search" type="text" placeholder="Gen ID, transaction #, reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <NiceCheckbox v-model="openOnly" label="Open only" @update:model-value="fetchPayments()" />
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; openOnly = false; fetchPayments();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! payments">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="payments.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No payments found.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : payments?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/supplier-payments/${payment.id}`" class="text-red-600 hover:underline">{{ payment.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(payment)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="payments" :paginator="payments" class="mt-4" @page="fetchPayments" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete payment?"
            :message="toDelete ? `Payment ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />

        <ConfirmDialog
            :show="Boolean(toConvert)"
            title="Convert payment to deposit?"
            :message="toConvert ? `Payment ${toConvert.gen_id} will be converted into a supplier deposit.` : ''"
            confirm-label="Yes, convert"
            :processing="converting"
            @confirm="confirmConvert"
            @cancel="toConvert = null"
        />
    </AppLayout>
</template>
