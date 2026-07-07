<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import NiceCheckbox from "../../../components/Form/NiceCheckbox.vue";

const auth = useAuthStore();

const refunds = ref(null);
const loading = ref(false);
const search = ref('');
const openOnly = ref(false);

async function fetchRefunds(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/supplier-refunds', {
            params: {
                q: search.value || undefined,
                open: openOnly.value ? 1 : undefined,
                page
            }
        });
        refunds.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchRefunds());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-refunds/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchRefunds(refunds.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (refund) => [
    ...(auth.can('supplierRefunds.show') ? [{ label: 'View', href: `/supplier-refunds/${refund.id}` }] : []),
    ...(auth.can('supplierRefunds.edit') ? [{ label: 'Edit', href: `/supplier-refunds/${refund.id}/edit` }] : []),
    ...(auth.can('supplierRefunds.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = refund) }] : []),
];
</script>

<template>
    <AppLayout title="Supplier Refunds" fluid>
        <FullWidthBox title="Supplier Refunds" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchRefunds()">
                <input v-model="search" type="text" placeholder="Gen ID, transaction #…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <NiceCheckbox v-model="openOnly" label="Open only" @update:model-value="fetchRefunds()" />
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchRefunds();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2">Transaction #</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! refunds">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="refunds.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No refunds found.</td>
                        </tr>
                        <tr v-for="refund in (loading ? [] : refunds?.data ?? [])" :key="refund.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/supplier-refunds/${refund.id}`" class="text-red-600 hover:underline">{{ refund.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ refund.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(refund.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(refund.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ refund.transaction_nr ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ refund.payment_method ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ refund.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(refund)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="refunds" :paginator="refunds" class="mt-4" @page="fetchRefunds" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete refund?"
            :message="toDelete ? `Refund ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
