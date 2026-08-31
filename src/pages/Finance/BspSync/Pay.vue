<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource, castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { money } from '../../../helpers/money.js';
import { todayApiDate } from '../../../helpers/date.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';

// Step 2 of the BSP bill sync: record the single collecting payment that settles
// the statement. The backend re-runs the match from the cached hash and, on a
// full match, links every matched bill and credit note to this payment.

const route = useRoute();
const router = useRouter();
const hash = route.params.hash;

const formOptions = useFormOptionsStore();
const paymentMethods = computed(() => toOptions(formOptions.paymentMethods));

const preview = ref(null);
const loaded = ref(false);
const loadError = ref('');
const processing = ref(false);
const errors = ref({});
const error = ref('');

const form = reactive({
    payment_method_id: null,
    on_date: todayApiDate(),
    transaction_nr: '',
    notes: '',
});

const billRows = computed(() => Object.entries(preview.value?.bills ?? {})
    .map(([reference, row]) => ({ reference, ...row })));
const creditRows = computed(() => Object.entries(preview.value?.credits ?? {})
    .map(([reference, row]) => ({ reference, ...row })));

onMounted(async () => {
    try {
        const { data } = await api.get(`/finance/bsp-sync/preview/${hash}`);
        preview.value = castResource(data);

        if (! preview.value?.fullMatch) {
            loadError.value = 'This BSP statement is not a full match and cannot be paid. Go back and review it.';
        }
    } catch (e) {
        loadError.value = e.response?.status === 404
            ? 'This BSP statement is no longer cached. Please upload it again.'
            : (e.response?.data?.message ?? 'Could not load the BSP statement.');
    } finally {
        loaded.value = true;
    }
});

async function submit() {
    if (processing.value || ! preview.value?.fullMatch) {
        return;
    }

    processing.value = true;
    errors.value = {};
    error.value = '';

    try {
        const { data } = await api.post('/finance/bsp-sync/pay', {
            hash,
            payment_method_id: form.payment_method_id,
            amount: preview.value.expectedAmount,
            on_date: form.on_date,
            transaction_nr: form.transaction_nr || null,
            notes: form.notes || null,
        });

        router.push(routeUrl('supplierPayments.show', castMutation(data).id));
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            error.value = e.response?.data?.message ?? 'Could not record the BSP payment.';
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="BSP Sync — Pay &amp; Reconcile" fluid>
        <Loader v-if="! loaded" />

        <div v-else-if="loadError" class="space-y-4">
            <p class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{{ loadError }}</p>
            <RouterLink :to="routeUrl('bspSync.index')" class="inline-block rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">
                Back to BSP Sync
            </RouterLink>
        </div>

        <form v-else class="space-y-6" @submit.prevent="submit">
            <p v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox title="Payment details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                    <InputText :model-value="money(preview.expectedAmount)" label="Amount" disabled />
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                    <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Will be reconciled" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                                <th class="border border-gray-300 px-2 py-2">Record</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in billRows" :key="`bill-${row.reference}`">
                                <td class="border border-gray-300 px-2 py-2">Bill</td>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.reference }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink :to="routeUrl('supplierBills.show', row.foundId)" class="text-blue-600 hover:underline" target="_blank">
                                        #{{ row.foundId }}
                                    </RouterLink>
                                </td>
                            </tr>
                            <tr v-for="row in creditRows" :key="`credit-${row.reference}`">
                                <td class="border border-gray-300 px-2 py-2">Credit note</td>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.reference }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink :to="routeUrl('supplierCreditNotes.show', row.foundId)" class="text-blue-600 hover:underline" target="_blank">
                                        #{{ row.foundId }}
                                    </RouterLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('bspSync.index')" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :loading="processing" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Save & Reconcile all' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
