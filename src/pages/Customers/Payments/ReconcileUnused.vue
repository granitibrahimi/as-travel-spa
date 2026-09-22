<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import DashboardWidget from '../../../components/DashboardWidget.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import InputText from '../../../components/Form/InputText.vue';

const notifications = useNotificationsStore();

// Same list as the Open Payments page — GET /customers/payments?open=1 —
// but 500 per page so the whole open list fits on one page.
const { response: apiResponse, loading, goToPage, reload } = useListFilters(
    {},
    async (params, { signal }) => castPaginated((await api.get('/customers/payments', { params: { ...params, open: 1, per_page: 500 }, signal })).data),
);

// payment id => amount to write off. Kept across pages, so a selection made
// on page 1 survives paging to page 2.
const amounts = reactive({});
const confirming = ref(false);
const processing = ref(false);
const errors = ref([]);

const selectedCount = computed(() => Object.keys(amounts).length);
const selectedTotal = computed(() => Object.values(amounts).reduce((sum, amount) => sum + amount, 0));

// In-page search + sort over the rows already loaded (no refetch). The search
// matches id, gen id, customer id/name, date and the amounts — typed either
// as-is ("1250.5") or as formatted ("1,250.50").
const search = ref('');
const sortField = ref('open_amount');
const sortDir = ref('asc');

const rows = computed(() => {
    if (loading.value || ! apiResponse.value) {
        return [];
    }

    const term = search.value.trim().toLowerCase();
    let list = apiResponse.value.data;

    if (term !== '') {
        list = list.filter((payment) => [
            payment.id,
            payment.gen_id,
            payment.customer?.id,
            payment.customer?.name,
            payment.on_date,
            payment.amount,
            payment.open_amount,
            money(payment.amount),
            money(payment.open_amount),
        ].some((value) => value !== null && value !== undefined && String(value).toLowerCase().includes(term)));
    }

    if (sortField.value) {
        const dir = sortDir.value === 'asc' ? 1 : -1;
        list = [...list].sort((a, b) => (Math.abs(Number(a[sortField.value])) - Math.abs(Number(b[sortField.value]))) * dir);
    }

    return list;
});

// Starts smallest → biggest; a click flips the direction.
function sortBy(field) {
    if (sortField.value !== field) {
        sortField.value = field;
        sortDir.value = 'asc';
    } else {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    }
}

function sortIndicator(field) {
    if (sortField.value !== field) {
        return '↕';
    }
    return sortDir.value === 'desc' ? '↓' : '↑';
}

function isSelected(payment) {
    return amounts[payment.id] !== undefined;
}

function fill(payment) {
    amounts[payment.id] = Math.abs(Number(payment.open_amount));
}

function toggle(payment) {
    if (isSelected(payment)) {
        delete amounts[payment.id];
    } else {
        fill(payment);
    }
}

function setAmount(payment, value) {
    if (value === '' || value === null || Number(value) <= 0) {
        delete amounts[payment.id];
        return;
    }
    amounts[payment.id] = Number(value);
}

async function submit() {
    if (processing.value || selectedCount.value === 0) {
        return;
    }
    processing.value = true;
    errors.value = [];

    try {
        await api.post('/customers/payments/reconcile-unused', {
            payments: Object.entries(amounts).map(([id, amount]) => ({ id: Number(id), amount })),
        });
        notifications.push({ type: 'success', message: 'Unused payments reconciled successfully.' });
        Object.keys(amounts).forEach((id) => delete amounts[id]);
        reload();
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.values(error.response.data.errors ?? {}).flat();
            notifications.push({ type: 'error', message: 'Unused payments could not be reconciled.' });
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
        confirming.value = false;
    }
}
</script>

<template>
    <AppLayout title="Reconcile Unused Payments" fluid>
        <DashboardWidget title="Reconcile Unused Customer Payments">
            <template #actions>
                <span class="text-sm text-gray-500">
                    {{ selectedCount }} selected · <span class="tabular-nums">{{ money(selectedTotal) }}</span>
                </span>
                <Button variant="primary" size="sm" :disabled="processing || selectedCount === 0" @click="confirming = true">
                    Reconcile
                </Button>
            </template>

            <div class="mb-4 max-w-sm">
                <InputText v-model="search" placeholder="Search by ID, customer, amount, date…" />
            </div>

            <div v-if="errors.length" class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul class="list-inside list-disc space-y-1">
                    <li v-for="(message, i) in errors" :key="i">{{ message }}</li>
                </ul>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">
                                <button type="button" class="inline-flex items-center gap-1 uppercase hover:text-gray-900" @click="sortBy('open_amount')">
                                    Open amount <span class="text-gray-400">{{ sortIndicator('open_amount') }}</span>
                                </button>
                            </th>
                            <th class="border border-gray-300 px-2 py-2">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Reconcile</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="rows.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">
                                {{ search.trim() !== '' ? 'No payments match the search.' : 'No open payments.' }}
                            </td>
                        </tr>
                        <tr v-for="payment in rows" :key="payment.id" class="hover:bg-gray-50" :class="{ 'bg-red-50/40': isSelected(payment) }">
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('customerPayments.show', payment.id)" class="text-red-600 hover:underline">
                                    {{ payment.id }}<br>
                                    {{ payment.gen_id }}
                                </RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.customer" :to="routeUrl('customers.show', payment.customer.id)" class="text-red-600 hover:underline">
                                    {{ payment.customer.id }} # {{ payment.customer.name }}
                                </RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right">
                                <button type="button" class="tabular-nums text-gray-700 hover:text-red-600 hover:underline" @click="fill(payment)">
                                    {{ money(payment.open_amount) }}
                                </button>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div v-if="payment.customer" class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors"
                                        :class="isSelected(payment)
                                            ? 'border-green-600 bg-green-600 text-white hover:border-red-600 hover:bg-red-600'
                                            : 'border-gray-300 text-gray-500 hover:border-green-600 hover:text-green-600'"
                                        :title="isSelected(payment) ? 'Remove from reconciliation' : 'Include in reconciliation'"
                                        @click="toggle(payment)"
                                    >
                                        <svg v-if="isSelected(payment)" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </button>
                                    <InputNumber
                                        class="!w-32 text-right"
                                        :model-value="amounts[payment.id] ?? null"
                                        @update:model-value="(value) => setAmount(payment, value)"
                                    />
                                </div>
                                <span v-else>—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </DashboardWidget>

        <ConfirmDialog
            :show="confirming"
            title="Reconcile unused payments?"
            :message="`${selectedCount} payment(s) totalling ${money(selectedTotal)} will be written off through a new journal and reconciled.`"
            confirm-label="Yes, reconcile"
            :processing="processing"
            @confirm="submit"
            @cancel="confirming = false"
        />
    </AppLayout>
</template>
