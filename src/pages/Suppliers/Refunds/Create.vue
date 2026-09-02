<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource, castMutation } from '../../../types/responses.js';
import { usePaymentMethodsRepository } from '../../../repositories/paymentMethods';
import { useNotificationsStore } from '../../../stores/notifications';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();

const supplierId = route.params.supplierId;

const form = reactive({
    payment_method_id: null,
    amount: null,
    transaction_nr: '',
    on_date: '',            // <input type=date> value, Y-m-d
    notes: '',
});

const paymentMethodsRepo = usePaymentMethodsRepository();
// Incoming methods, as [{ value, label }] for SearchSelect — reactive off the cache.
const paymentMethods = computed(() => paymentMethodsRepo.incoming());
// The endpoint reports the supplier's unlinked credit as a signed balance
// (payments and credit notes are stored negative in supplier_transactions_view),
// so a supplier with credit to give back comes through as a negative number.
// What's available to reimburse is that balance's magnitude.
const availableAmount = ref(null);
const availableToReimburse = computed(() => Math.abs(Number(availableAmount.value) || 0));
const supplier = ref(null);

// The amount may not exceed what's available to reimburse — flagged on the
// field and blocks submitting rather than being silently clamped.
const amountExceedsAvailable = computed(() =>
    form.amount !== null
    && form.amount !== ''
    && availableToReimburse.value > 0
    && Number(form.amount) > availableToReimburse.value,
);

const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    const supplierResponse = await api.get(`/suppliers/suppliers/${supplierId}`);
    supplier.value = castResource(supplierResponse.data);

    // The available amount for this supplier comes from its own endpoint; keep
    // the loader up until it lands so the amount's max is set before the form
    // shows.
    const { data } = await api.get('/suppliers/refunds/available-amount', {
        params: { supplier_id: supplierId ?? undefined },
    });
    availableAmount.value = castResource(data).available_amount;

    // Nothing to reimburse: bounce back to the supplier with a toast rather than
    // showing an empty form the user can't submit.
    if (availableToReimburse.value <= 0) {
        notifications.push({
            type: 'warning',
            message: 'This supplier has nothing to reimburse.',
        });
        router.replace(routeUrl('suppliers.show', supplierId));
        return;
    }

    loaded.value = true;
});

async function submit() {
    if (processing.value || amountExceedsAvailable.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form };

    try {
        const { data } = await api.post(`/suppliers/suppliers/${supplierId}/refunds`, payload);
        router.push(routeUrl('supplierRefunds.show', castMutation(data).id));
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

const cancelTo = routeUrl('suppliers.show', supplierId);
</script>

<template>
    <AppLayout title="New reimbursement" fluid>
        <Loader v-if="! loaded" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails v-if="supplier" :supplier="supplier" />

                <FullWidthBox title="Reimbursement details" :collapsible="false">
                    <p v-if="availableAmount !== null" class="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        Available for reimbursement: <span class="font-medium tabular-nums">{{ money(availableToReimburse) }}</span>
                    </p>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                        <div>
                            <label class="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-gray-700">
                                Amount *
                                <span v-if="amountExceedsAvailable" class="text-xs font-normal text-red-600">
                                    exceeds {{ money(availableToReimburse) }} available
                                </span>
                            </label>
                            <InputNumber v-model="form.amount" :error="errors.amount" :invalid="amountExceedsAvailable" min="0" />
                        </div>
                        <InputText v-model="form.transaction_nr" label="Transaction # *" :error="errors.transaction_nr" />
                        <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                    </div>
                    <div class="mt-4">
                        <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                    </div>
                </FullWidthBox>
            </div>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded || amountExceedsAvailable">
                    {{ processing ? 'Saving…' : 'Create reimbursement' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
