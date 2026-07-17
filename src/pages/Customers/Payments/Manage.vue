<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { todayApiDate } from '../../../helpers/date';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import {usePaymentMethodsRepository} from "../../../repositories/paymentMethods.js";

// Create + edit a customer payment. Mirrors the platform payments/create blade
// and Suppliers/Payments/Manage.vue. Create is nested under a customer
// (route param) and POSTs the flat /customer-payments endpoint with customer_id
// in the body; edit PUTs /customer-payments/{id}.
const route = useRoute();
const router = useRouter();

const paymentId = route.params.id ?? null;
const customerId = route.params.customer ?? null;
const isEdit = Boolean(paymentId);

const form = reactive({
    payment_method_id: null,
    amount: null,
    on_date: isEdit ? '' : todayApiDate(),   // API d.m.Y; create defaults to today
    reference: '',
    transaction_nr: '',
    notes: '',
});

const formOptions = useFormOptionsStore();
const paymentMethodsRepo = usePaymentMethodsRepository();
// Incoming methods, as [{ value, label }] for SearchSelect — reactive off the cache.
const paymentMethods = computed(() => paymentMethodsRepo.incoming());
const customer = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);
const canEditAmount = ref(true);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/customer-payments/${paymentId}`);
        const payment = data.data ?? data;
        customer.value = payment.customer ?? null;
        Object.assign(form, {
            payment_method_id: payment.payment_method_id,
            amount: payment.amount,
            on_date: payment.on_date ?? '',
            reference: payment.reference ?? '',
            transaction_nr: payment.transaction_nr ?? '',
            notes: payment.notes ?? '',
        });
        // Amount/method are locked once any of the payment is used.
        canEditAmount.value = payment.amount === payment.open_amount;
    } else {
        const { data } = await api.get(`/customers/${customerId}`);
        // This endpoint returns a raw resource wrapper ({ resource, with, ... }),
        // not the standard { data } envelope — unwrap defensively.
        customer.value = data.data ?? data.resource ?? data;
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
            await api.put(`/customer-payments/${paymentId}`, payload);
            router.push(`/customer-payments/${paymentId}`);
        } else {
            const { data } = await api.post('/customer-payments', { ...payload, customer_id: customerId });
            router.push(`/customer-payments/${data.id ?? (data.data ?? data)?.id}`);
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

const cancelTo = isEdit ? `/customer-payments/${paymentId}` : `/customers/${customerId}`;
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit Customer Payment' : 'Create a Customer Payment'" fluid>
        <Loader v-if="! loaded" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
                <FullWidthBox v-if="customer" title="Customer" :collapsible="false">
                    <CustomerDetails :customer="customer" />
                </FullWidthBox>

                <FullWidthBox title="Payment details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" placeholder="Select a payment method" :error="errors.payment_method_id" :disabled="! canEditAmount" />
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" :disabled="! canEditAmount" />
                        <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                        <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
                        <InputText v-model="form.reference" label="Reference" :error="errors.reference" />
                    </div>
                    <p v-if="! canEditAmount" class="mt-2 text-xs text-gray-500">The amount and payment method cannot be changed because part of this payment is already used.</p>
                    <div class="mt-4">
                        <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                    </div>
                </FullWidthBox>
            </div>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update payment' : 'Create payment') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
