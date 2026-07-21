<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
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
    const { data } = await api.get('/petty-cash/undeposited-payments');
    rows.value = (data.payments ?? []).map((payment) => ({
        ...payment,
        included: false,
        amount: payment.open_amount,
    }));
    ready.value = true;
});

function clampAmount(row) {
    const value = parseFloat(row.amount) || 0;
    row.amount = Math.min(Math.max(value, 0), row.open_amount);
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
        const { data } = await api.post('/petty-cash/deposit', payload);
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
                    <InputText v-model="form.expected_amount" type="number" step="0.01" label="Deposited amount *" :error="errors.expected_amount" />
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
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 50px;">Add</th>
                                <th class="border border-gray-300 px-2 py-2">Payment</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 150px;">Deposit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="rows.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No undeposited cash payments.</td>
                            </tr>
                            <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50" :class="row.included ? 'bg-green-50' : ''">
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <input v-model="row.included" type="checkbox">
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.gen_id ?? row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.on_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.open_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right">
                                    <input
                                        v-model="row.amount"
                                        type="number"
                                        step="0.01"
                                        :max="row.open_amount"
                                        :disabled="! row.included"
                                        class="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                                        @input="clampAmount(row)"
                                    >
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
