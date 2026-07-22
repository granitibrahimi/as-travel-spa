<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
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
import { usePaymentMethodsRepository } from '../../../repositories/paymentMethods.js';

// Edit a customer payment. PUTs /customers/payments/{id}. Amount and payment
// method are locked once any part of the payment has been used.
const route = useRoute();
const router = useRouter();

const paymentId = route.params.id;

const form = reactive({
    payment_method_id: null,
    amount: null,
    on_date: '',
    reference: '',
    transaction_nr: '',
    notes: '',
});

const paymentMethodsRepo = usePaymentMethodsRepository();
const paymentMethods = computed(() => paymentMethodsRepo.incoming());
const customer = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);
const canEditAmount = ref(true);

onMounted(async () => {
    const { data } = await api.get(`/customers/payments/${paymentId}`);
    const payment = castResource(data);
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
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/customers/payments/${paymentId}`, { ...form });
        router.push(routeUrl('customerPayments.show', paymentId));
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
    <AppLayout title="Edit Customer Payment" fluid>
        <Loader v-if="! loaded" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
                <CustomerDetails v-if="customer" :customer="customer" />

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
                <RouterLink :to="routeUrl('customerPayments.show', paymentId)" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update payment' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
