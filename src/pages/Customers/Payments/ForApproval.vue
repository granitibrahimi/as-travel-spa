<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import DashboardWidget from '../../../components/DashboardWidget.vue';
import Select from '../../../components/Form/Select.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

// GET /customers/payments/not-approved-cash — one call returns every
// not-yet-approved payment plus the list of agents; filtering by agent
// happens client-side (see agentPayments/agentTotal below).
// Shape: { payments: [{ id, customer: {id,name}, payment_method: {id,name},
//           amount, date, created_by: {id,name} }], agents: [{ id, name }] }
const loading = ref(true);
const error = ref(null);
const payments = ref([]);
const agents = ref([]);
const agentOptions = computed(() => agents.value.map((agent) => ({ value: agent.id, label: agent.name })));

// `selectedAgent` is the dropdown value (null = "all employees") — the list
// below always reflects it live; there's no separate "apply" step, so nothing
// stays hidden waiting for a click.
const selectedAgent = ref(null);

async function loadData() {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await api.get('/customers/payments/not-approved-cash');
        const payload = castResource(data);
        payments.value = payload.payments ?? [];
        agents.value = payload.agents ?? [];
    } catch {
        error.value = 'Could not load payments right now.';
    } finally {
        loading.value = false;
    }
}

// "View daily payments" re-pulls the latest data from the server; filtering
// itself is already live off `selectedAgent`, so this is a manual refresh.
function viewDailyPayments() {
    loadData();
}

const selectedAgentName = computed(() => agents.value.find((agent) => agent.id === selectedAgent.value)?.name ?? '');

// No agent selected ("All employees") shows every not-yet-approved payment.
const agentPayments = computed(() => {
    if (selectedAgent.value === null) {
        return payments.value;
    }

    return payments.value.filter((payment) => payment.created_by?.id === selectedAgent.value);
});

const agentTotal = computed(() =>
    agentPayments.value.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
);

// Nothing left to approve at all — hide the filter/list entirely.
const allApproved = computed(() => payments.value.length === 0 && agents.value.length === 0);

const confirmApprove = ref(false);
const approving = ref(false);

async function approveAll() {
    if (approving.value) {
        return;
    }

    approving.value = true;

    try {
        await api.post('/customers/payments/approve-all-for-employee', { user_id: selectedAgent.value });
        confirmApprove.value = false;
        await loadData();
    } finally {
        approving.value = false;
    }
}

onMounted(loadData);
</script>

<template>
    <AppLayout title="Payments for Approval" fluid>
        <Loader v-if="loading" />
        <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

        <div v-else-if="allApproved" class="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 py-16 text-center text-green-700">
            <svg class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-semibold">All received Cash and Cash B are approved.</p>
        </div>

        <div v-else class="space-y-6">
            <DashboardWidget title="Filter">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div class="sm:w-72">
                        <Select v-model="selectedAgent" :options="agentOptions" label="Employee" placeholder="All employees" />
                    </div>
                    <button
                        type="button"
                        class="inline-flex flex-1 items-center justify-center gap-2 rounded bg-green-600 px-4 py-1.5 text-base font-medium text-white hover:bg-green-700"
                        @click="viewDailyPayments"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        View daily payments
                    </button>
                </div>
            </DashboardWidget>

            <DashboardWidget v-if="selectedAgent !== null" title="Employee summary">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div class="flex flex-1 items-center justify-between rounded border border-gray-200 bg-gray-50 px-4 py-3">
                        <span class="text-lg font-bold">Total to get from: {{ selectedAgentName }}</span>
                        <span class="text-lg font-bold tabular-nums">{{ money(agentTotal) }}</span>
                    </div>
                    <button
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded bg-green-600 px-4 py-1.5 text-base font-medium text-white hover:bg-green-700 disabled:opacity-60"
                        :disabled="! agentPayments.length"
                        @click="confirmApprove = true"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        Approve all
                    </button>
                </div>
                <p class="mt-3 text-sm text-gray-500">
                    This will add <strong>{{ money(agentTotal) }}</strong> to Daily Cash.
                </p>
            </DashboardWidget>

            <DashboardWidget :title="selectedAgent !== null ? `List of payments received by: ${selectedAgentName}` : 'List of all payments'">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Client</th>
                                <th class="border border-gray-300 px-2 py-2">Method</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                                <th class="border border-gray-300 px-2 py-2">Date</th>
                                <th class="border border-gray-300 px-2 py-2">Created by</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="agentPayments.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No payments waiting for approval.</td>
                            </tr>
                            <tr v-for="payment in agentPayments" :key="payment.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink :to="routeUrl('customerPayments.show', payment.id)" class="inline-flex items-center gap-1.5 text-red-600 hover:underline">
                                        {{ payment.id }}
                                    </RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink v-if="payment.customer" :to="routeUrl('customers.show', payment.customer.id)" class="inline-flex items-center gap-1.5 text-red-600 hover:underline">
                                        <span>{{ payment.customer.id }} # {{ payment.customer.name }}</span>
                                    </RouterLink>
                                    <span v-else>—</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method?.name ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.date }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.created_by?.name ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </DashboardWidget>
        </div>

        <ConfirmDialog
            :show="confirmApprove"
            title="Approve all payments?"
            :message="`${money(agentTotal)} from ${selectedAgentName} will be approved and added to Daily Cash.`"
            confirm-label="Yes, approve all"
            :processing="approving"
            @confirm="approveAll"
            @cancel="confirmApprove = false"
        />
    </AppLayout>
</template>
