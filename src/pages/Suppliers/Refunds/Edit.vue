<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { usePaymentMethodsRepository } from '../../../repositories/paymentMethods';
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

const refundId = route.params.id;

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
const supplier = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    const { data } = await api.get(`/supplier-refunds/${refundId}`);
    const refund = castResource(data);
    supplier.value = refund.supplier ?? null;
    Object.assign(form, {
        payment_method_id: refund.payment_method_id,
        amount: refund.amount,
        transaction_nr: refund.transaction_nr ?? '',
        on_date: refund.on_date ?? '',
        notes: refund.notes ?? '',
    });

    const available = await api.get('/supplier-refunds/available-amount', {
        params: { supplier_id: refund.supplier?.id ?? undefined },
    });
    availableAmount.value = castResource(available.data).available_amount;

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
        await api.put(`/supplier-refunds/${refundId}`, payload);
        router.push(routeUrl('supplierRefunds.show', refundId));
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

const cancelTo = routeUrl('supplierRefunds.show', refundId);
</script>

<template>
    <AppLayout title="Edit refund" fluid>
        <Loader v-if="! loaded" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails v-if="supplier" :supplier="supplier" />

                <FullWidthBox title="Refund details" :collapsible="false">
                    <p v-if="availableAmount !== null" class="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        Available for reimbursement: <span class="font-medium tabular-nums">{{ money(availableAmount) }}</span>
                    </p>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" min="0" />
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
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update refund' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
