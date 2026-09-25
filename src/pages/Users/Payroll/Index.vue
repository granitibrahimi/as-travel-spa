<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { downloadFile } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

// GET /users/payrolls — the saved months (draft / finalized), newest first.
// Preparing a month opens it live; it's only stored once saved.
// Row menu: view, finalize a draft (POST …/finalize) and, once finalized,
// download the PCB salary payment file (GET …/pcb-csv, net salaries).
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const toFinalize = ref(null);
const finalizing = ref(false);
const payrolls = ref(null);
const loading = ref(false);

const pad = (n) => String(n).padStart(2, '0');
const today = new Date();
const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
// <input type="month"> speaks "YYYY-MM"; default to the previous month.
const month = ref(`${previous.getFullYear()}-${pad(previous.getMonth() + 1)}`);

async function fetchPayrolls() {
    loading.value = true;

    try {
        payrolls.value = castResource((await api.get('/users/payrolls')).data).payrolls;
    } finally {
        loading.value = false;
    }
}

function prepare() {
    const [year, monthNumber] = month.value.split('-').map(Number);

    if (year && monthNumber) {
        router.push(routeUrl('payrolls.show', year, monthNumber));
    }
}

async function finalize() {
    if (finalizing.value) {
        return;
    }

    finalizing.value = true;

    try {
        await api.post(`/users/payrolls/${toFinalize.value.year}/${toFinalize.value.month}/finalize`);
        notifications.push({ type: 'success', message: `Payroll for ${toFinalize.value.period} finalized.` });
        await fetchPayrolls();
    } catch (e) {
        const errors = e.response?.data?.errors;
        notifications.push({ type: 'error', message: (errors && Object.values(errors)[0]?.[0]) ?? e.response?.data?.message ?? 'Could not finalize the payroll.' });
    } finally {
        toFinalize.value = null;
        finalizing.value = false;
    }
}

async function downloadPcb(payroll) {
    try {
        await downloadFile(`/users/payrolls/${payroll.year}/${payroll.month}/pcb-csv`, { fallbackName: 'pagat_pcb.csv' });
    } catch (e) {
        notifications.push({ type: 'error', message: e.response?.data?.message ?? 'Could not download the PCB payment file.' });
    }
}

const rowActions = (payroll) => [
    { label: 'View', to: routeUrl('payrolls.show', payroll.year, payroll.month) },
    ...(payroll.can_finalize && auth.can('payrolls.finalize') ? [{ label: 'Finalize', action: () => (toFinalize.value = payroll) }] : []),
    ...(payroll.status.id === 1 && auth.can('payrolls.paymentFile') ? [{ label: 'Download PCB Payment CSV', action: () => downloadPcb(payroll) }] : []),
];

onMounted(fetchPayrolls);
</script>

<template>
    <AppLayout title="Payroll">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Payroll</h1>

            <FullWidthBox title="Prepare a month" :collapsible="false">
                <form class="flex flex-wrap items-end gap-3" @submit.prevent="prepare">
                    <div>
                        <label for="payroll-month" class="mb-1 block text-sm font-medium text-gray-700">Month</label>
                        <input
                            id="payroll-month"
                            v-model="month"
                            type="month"
                            class="rounded border border-gray-300 px-2 py-1.5 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        >
                    </div>
                    <Button type="submit" variant="primary">Prepare payroll</Button>
                </form>
                <p class="mt-3 text-xs text-gray-500">
                    Every employee with a contract in the month is paid their base salary, plus their bonus when the contract is with bonuses.
                    Save the month as a draft (you can save it again), then finalize it — a finalized month no longer changes.
                </p>
            </FullWidthBox>

            <FullWidthBox title="Saved months" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Month</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 100px;">Employees</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Net salaries</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Gross salaries</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Employer pension</th>
                                <th class="border border-gray-300 px-2 py-2">Saved</th>
                                <th class="border border-gray-300 px-2 py-2">Finalized</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! payrolls">
                                <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="payrolls.length === 0">
                                <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No month saved yet.</td>
                            </tr>
                            <tr v-for="payroll in (loading ? [] : payrolls ?? [])" :key="payroll.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="routeUrl('payrolls.show', payroll.year, payroll.month)" class="hover:underline">{{ payroll.period }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="payroll.status.id === 1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                                        {{ payroll.status.name }}
                                    </span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ payroll.employees }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payroll.net_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payroll.gross_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payroll.employer_pension) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-xs text-gray-600">{{ payroll.saved_at }}<span v-if="payroll.saved_by"> · {{ payroll.saved_by.name }}</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-xs text-gray-600">
                                    <template v-if="payroll.finalized_at">{{ payroll.finalized_at }}<span v-if="payroll.finalized_by"> · {{ payroll.finalized_by.name }}</span></template>
                                    <span v-else>—</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <DropdownMenu :items="rowActions(payroll)" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="Boolean(toFinalize)"
            title="Finalize payroll?"
            :message="toFinalize ? `${toFinalize.period} becomes read-only: its figures no longer change with contracts, vacations or factors. Only the last finalized month can be reopened.` : ''"
            confirm-label="Yes, finalize"
            :processing="finalizing"
            @confirm="finalize"
            @cancel="toFinalize = null"
        />
    </AppLayout>
</template>
