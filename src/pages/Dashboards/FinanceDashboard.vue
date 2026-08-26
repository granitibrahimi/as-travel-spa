<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import StatCard from '../../components/StatCard.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';
import api from '../../helpers/api';
import { money } from '../../helpers/money';
import { routeUrl } from '../../helpers/route.js';

// Reports are plain navigation links (no data of their own), so they're
// listed independent of the `metrics` fetch above and shown regardless of
// whether that fetch succeeds.
const reports = [
    { label: 'Customer Invoices Report', to: routeUrl('financeReports.customerInvoices') },
    { label: '4000 vs 5000', to: routeUrl('financeReports.accountComparison') },
    { label: 'Sales Book (Libri i Shitjes)', to: routeUrl('financeReports.salesBook') },
    { label: 'Purchases Book (Libri i Blerjeve)', to: routeUrl('financeReports.purchasesBook') },
];

// GET /dashboards/finance — shape:
// { not_approved_cash: { count, amount }, not_approved_cash_b: { count, amount },
//   unused_customer_payments: number, unused_supplier_payments: number,
//   due_invoices: number }
const loading = ref(true);
const error = ref(null);
const metrics = ref(null);

onMounted(async () => {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await api.get('/dashboards/finance');
        metrics.value = data.data;
    } catch {
        error.value = 'Could not load your dashboard right now.';
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="space-y-6">
        <Loader v-if="loading" message="Loading your dashboard" />

        <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ error }}
        </p>

        <div v-else-if="metrics" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RouterLink :to="routeUrl('customerPayments.forApproval')" class="relative block h-full transition-shadow hover:shadow-md">
                <svg class="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <StatCard
                    class="h-full"
                    label="Not approved Cash and Cash B"
                    :value="metrics.not_approved_cash.count"
                    :sub="money(metrics.not_approved_cash.amount)"
                    animate
                />
            </RouterLink>
            <RouterLink :to="routeUrl('customerPayments.open')" class="relative block h-full transition-shadow hover:shadow-md">
                <svg class="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <StatCard
                    class="h-full"
                    label="Open customer payments"
                    :value="metrics.unused_customer_payments"
                    animate
                />
            </RouterLink>
            <RouterLink :to="routeUrl('supplierPayments.open')" class="relative block h-full transition-shadow hover:shadow-md">
                <svg class="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <StatCard
                    class="h-full"
                    label="Open supplier payments"
                    :value="metrics.unused_supplier_payments"
                    animate
                />
            </RouterLink>
            <RouterLink :to="routeUrl('customerInvoices.due')" class="relative block h-full transition-shadow hover:shadow-md">
                <svg class="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <StatCard
                    class="h-full"
                    label="Due Invoices"
                    :value="metrics.due_invoices"
                    animate
                />
            </RouterLink>
        </div>

        <FullWidthBox title="Reports" :collapsible="false">
            <ul class="divide-y divide-gray-200">
                <li v-for="report in reports" :key="report.to">
                    <RouterLink :to="report.to" class="flex items-center justify-between px-1 py-2.5 text-sm text-gray-700 hover:text-red-600">
                        {{ report.label }}
                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </RouterLink>
                </li>
            </ul>
        </FullWidthBox>
    </div>
</template>
