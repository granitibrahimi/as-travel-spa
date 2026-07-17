<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const reconciliations = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchReconciliations(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customer-reconciliations', { params: { q: search.value || undefined, page } });
        reconciliations.value = { data: data.data, ...data.pagination };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchReconciliations());
</script>

<template>
    <AppLayout title="Customer Reconciliations" fluid>
        <FullWidthBox title="Customer Reconciliations" :collapsible="false">
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
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">QB</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! reconciliations">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="reconciliations.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No reconciliations found.</td>
                        </tr>
                        <tr v-for="reconciliation in (loading ? [] : reconciliations?.data ?? [])" :key="reconciliation.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/customer-reconciliations/${reconciliation.id}`" class="text-red-600 hover:underline">{{ reconciliation.id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="reconciliation.customer" :to="`/customers/${reconciliation.customer.id}`" class="text-red-600 hover:underline">{{ reconciliation.customer.id }} # {{ reconciliation.customer.name }}</RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.reference ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ reconciliation.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span v-if="reconciliation.has_qb" class="text-green-600">✓</span>
                                <span v-else class="text-gray-300">—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="reconciliations" :paginator="reconciliations" class="mt-4" @page="fetchReconciliations" />
        </FullWidthBox>
    </AppLayout>
</template>
