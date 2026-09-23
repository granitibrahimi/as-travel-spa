<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate } from '../../../helpers/date';
import Loader from '../../../components/Loader.vue';

const router = useRouter();

const rows = ref([]);
const ready = ref(false);
const errors = ref({});
const processing = ref(false);

const form = reactive({
    date: todayApiDate(),
    expected_amount: null,
    notes: '',
});

onMounted(async () => {
    const { data } = await api.get('/finance/petty-cash/undeposited-payments');
    // The endpoint wraps its payload in the standard resource envelope
    // (`{ data: { payments: [...] } }`) — same as BankDeposits/Create.vue's
    // equivalent endpoint. Reading `data.payments` directly (as before) always
    // read undefined, so this table silently stayed empty.
    const undeposited = castResource(data) ?? {};
    rows.value = (undeposited.payments ?? []).map((payment) => ({
        ...payment,
        included: false,
        amount: null,
    }));
    ready.value = true;
});

// Plus toggle, same as the reconcile-unused page: adding a row fills its whole
// open amount, clicking again removes it.
function toggle(row) {
    row.included = ! row.included;
    row.amount = row.included ? row.open_amount : null;
}

// Typing an amount includes the row (clamped to its open amount); clearing it
// removes it. A 0 is kept as typed (so "0.5" can still be entered) but doesn't
// include the row.
function setAmount(row, value) {
    if (value === null || value === '') {
        row.included = false;
        row.amount = null;
        return;
    }

    row.amount = Math.min(Math.max(Number(value), 0), row.open_amount);
    row.included = row.amount > 0;
}

const selectedTotal = computed(() => rows.value
    .filter((row) => row.included)
    .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0));

const expected = computed(() => parseFloat(form.expected_amount) || 0);
const difference = computed(() => expected.value - selectedTotal.value);
const matches = computed(() => selectedTotal.value > 0 && Math.round(difference.value * 100) === 0);

function useSelectedAsExpected() {
    form.expected_amount = selectedTotal.value.toFixed(2);
}

async function submit() {
    if (processing.value || ! matches.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {
        date: form.date,
        expected_amount: form.expected_amount,
        notes: form.notes,
        entries: rows.value
            .filter((row) => row.included && (parseFloat(row.amount) || 0) > 0)
            .map((row) => ({ customer_payment_id: row.id, amount: row.amount })),
    };

    try {
        const { data } = await api.post('/finance/petty-cash/deposit', payload);
        router.push(routeUrl('accountTransfers.show', castMutation(data).id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Daily Cash → Petty Cash" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Daily Cash → Petty Cash" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DateInput v-model="form.date" label="Date *" :error="errors.date" />
                    <InputNumber v-model="form.expected_amount" label="Deposited amount *" :error="errors.expected_amount" />
                    <InputText v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-6 text-sm">
                    <span class="text-gray-500">Selected <span class="font-semibold tabular-nums text-gray-800">{{ money(selectedTotal) }}</span></span>
                    <span class="text-gray-500">Deposited <span class="font-semibold tabular-nums text-gray-800">{{ money(expected) }}</span></span>
                    <span
                        class="rounded px-2 py-0.5 text-xs font-medium"
                        :class="matches ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    >
                        {{ matches ? 'Matches' : `Difference ${money(difference)}` }}
                    </span>
                    <Button type="button" size="sm" @click="useSelectedAsExpected">Use selected total</Button>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Undeposited cash payments" :collapsible="false">
                <p v-if="errors.entries" class="mb-3 text-sm text-red-600">{{ errors.entries }}</p>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Payment</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2">Payment Method</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 190px;">Deposit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="rows.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No undeposited cash payments.</td>
                            </tr>
                            <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50" :class="row.included ? 'bg-green-50' : ''">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.gen_id ?? row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.payment_method ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.on_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.open_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <div class="flex items-center gap-2">
                                        <button
                                            type="button"
                                            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors"
                                            :class="row.included
                                                ? 'border-green-600 bg-green-600 text-white hover:border-red-600 hover:bg-red-600'
                                                : 'border-gray-300 text-gray-500 hover:border-green-600 hover:text-green-600'"
                                            :title="row.included ? 'Remove from deposit' : 'Add to deposit'"
                                            @click="toggle(row)"
                                        >
                                            <svg v-if="row.included" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        </button>
                                        <InputNumber
                                            class="!w-32 text-right"
                                            :model-value="row.amount"
                                            @update:model-value="(value) => setAmount(row, value)"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('pettyCash.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! matches">
                    {{ processing ? 'Saving…' : 'Create deposit' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
