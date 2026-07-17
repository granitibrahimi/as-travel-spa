<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';

const route = useRoute();
const router = useRouter();

const paymentId = route.params.id ?? null;
const supplierId = route.params.supplierId ?? null;
const isEdit = Boolean(paymentId);

const form = reactive({
    payment_method_id: null,
    amount: null,
    on_date: '',            // <input type=date> value, Y-m-d
    reference: '',
    transaction_nr: '',
    notes: '',
});

const formOptions = useFormOptionsStore();
const paymentMethods = computed(() => toOptions(formOptions.paymentMethods));
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);
const canEditAmount = ref(true);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/supplier-payments/${paymentId}`);
        const payment = data.data ?? data;
        Object.assign(form, {
            payment_method_id: payment.payment_method_id,
            amount: payment.amount,
            on_date: payment.on_date ?? '',
            reference: payment.reference ?? '',
            transaction_nr: payment.transaction_nr ?? '',
            notes: payment.notes ?? '',
        });
        canEditAmount.value = payment.amount === payment.open_amount;
    }

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
            await api.put(`/supplier-payments/${paymentId}`, payload);
            router.push(`/supplier-payments/${paymentId}`);
        } else {
            const { data } = await api.post(`/suppliers/${supplierId}/payments`, payload);
            router.push(`/supplier-payments/${data.id}`);
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

const cancelTo = isEdit ? `/supplier-payments/${paymentId}` : `/suppliers/${supplierId}`;
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit payment' : 'New payment'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Payment details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                    <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" :disabled="! canEditAmount" />
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                    <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
                    <InputText v-model="form.reference" label="Reference" :error="errors.reference" />
                </div>
                <p v-if="! canEditAmount" class="mt-2 text-xs text-gray-500">The amount cannot be changed because part of this payment is already used.</p>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update payment' : 'Create payment') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
