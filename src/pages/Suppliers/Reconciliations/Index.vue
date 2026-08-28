<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchReconciliations(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/suppliers/reconciliations', {
            params: {
                q: search.value || undefined,
                // Deep-links from a supplier page (?supplier_id=…) narrow the list.
                supplier_id: route.query.supplier_id || undefined,
                page,
            },
        });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchReconciliations());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/suppliers/reconciliations/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchReconciliations(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

// Reconciliations have no Edit — only View, QuickBooks and Delete. QB is
// data-driven (`qb_link` present); deleting hits DELETE
// /suppliers/reconciliations/{id} (perm supplierReconciliations.delete) and
// reverses the linked transactions' balances before removing the record.
const rowActions = (reconciliation) => [
    ...(auth.can('supplierReconciliations.show')
        ? [{ label: 'View', to: routeUrl('supplierReconciliations.show', reconciliation.id) }]
        : []),
    ...(reconciliation.qb_link ? [{ label: 'QuickBooks', href: reconciliation.qb_link }] : []),
    ...(auth.can('supplierReconciliations.delete')
        ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = reconciliation) }]
        : []),
];
</script>

<template>
    <AppLayout title="Supplier Reconciliations" fluid>
        <FullWidthBox title="Supplier Reconciliations" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchReconciliations()">
                <input v-model="search" type="text" placeholder="Reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchReconciliations();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 90px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">QB</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No reconciliations found.</td>
                        </tr>
                        <tr v-for="reconciliation in (loading ? [] : apiResponse?.data ?? [])" :key="reconciliation.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('supplierReconciliations.show', reconciliation.id)" class="text-red-600 hover:underline">{{ reconciliation.id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="reconciliation.supplier" :to="routeUrl('suppliers.show', reconciliation.supplier.id)" class="text-red-600 hover:underline">{{ reconciliation.supplier.id }} # {{ reconciliation.supplier.name }}</RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.reference ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ reconciliation.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span v-if="reconciliation.has_qb" class="text-green-600">✓</span>
                                <span v-else class="text-gray-300">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(reconciliation)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchReconciliations" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete reconciliation?"
            :message="toDelete ? `Reconciliation #${toDelete.id} will be deleted and every linked transaction reversed, restoring the balances they adjusted. This cannot be undone.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
