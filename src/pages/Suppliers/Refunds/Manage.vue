<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { usePaymentMethodsRepository } from '../../../repositories/paymentMethods';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';
import Alert from '../../../components/Alert.vue';

const route = useRoute();
const router = useRouter();

const refundId = route.params.id ?? null;
const supplierId = route.params.supplierId ?? null;
const isEdit = Boolean(refundId);

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
const availableAmount = ref(null);
// Nothing to refund: block creating a new refund when the supplier has no
// available balance. Edits stay open so existing refunds remain adjustable.
const nothingToReimburse = computed(() => !isEdit && Number(availableAmount.value) <= 0);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    let optionsSupplierId = supplierId;

    if (isEdit) {
        const { data } = await api.get(`/supplier-refunds/${refundId}`);
        const refund = data.data ?? data;
        optionsSupplierId = refund.supplier?.id ?? null;
        Object.assign(form, {
            payment_method_id: refund.payment_method_id,
            amount: refund.amount,
            transaction_nr: refund.transaction_nr ?? '',
            on_date: refund.on_date ?? '',
            notes: refund.notes ?? '',
        });
    }

    // Payment methods come from the cached form options (incoming only). The
    // available amount for this supplier comes from its own endpoint; keep the
    // loader up until it lands so the amount's max is set before the form shows.
    const { data } = await api.get('/supplier-refunds/available-amount', {
        params: { supplier_id: optionsSupplierId ?? undefined },
    });
    availableAmount.value = data.available_amount;

    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form };

    try {
        if (isEdit) {
            await api.put(`/supplier-refunds/${refundId}`, payload);
            router.push(`/supplier-refunds/${refundId}`);
        } else {
            const { data } = await api.post(`/suppliers/${supplierId}/refunds`, payload);
            router.push(`/supplier-refunds/${data.id}`);
        }
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

const cancelTo = isEdit ? `/supplier-refunds/${refundId}` : `/suppliers/${supplierId}`;
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit refund' : 'New refund'">
        <Loader v-if="! loaded" />
        <Alert v-else-if="nothingToReimburse" type="warning">
            There is nothing to reimburse back to this supplier.
        </Alert>
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Refund details" :collapsible="false">
                <p v-if="availableAmount !== null" class="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Available for reimbursement: <span class="font-medium tabular-nums">{{ money(availableAmount) }}</span>
                </p>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                    <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" min="0" :max="availableAmount ?? undefined" />
                    <InputText v-model="form.transaction_nr" label="Transaction # *" :error="errors.transaction_nr" />
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update refund' : 'Create refund') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
