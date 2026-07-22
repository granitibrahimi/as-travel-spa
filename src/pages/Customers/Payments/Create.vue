<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { todayApiDate } from '../../../helpers/date';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { castResource, castMutation } from '../../../types/responses.js';
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

// Create a customer payment. Nested under a customer (route param); POSTs the
// flat /customers/payments endpoint with customer_id in the body.
const route = useRoute();
const router = useRouter();

const customerId = route.params.customer;

const form = reactive({
    payment_method_id: null,
    amount: null,
    on_date: todayApiDate(),   // API d.m.Y; defaults to today
    reference: '',
    transaction_nr: '',
    notes: '',
});

const paymentMethodsRepo = usePaymentMethodsRepository();
// Incoming methods, as [{ value, label }] for SearchSelect — reactive off the cache.
const paymentMethods = computed(() => paymentMethodsRepo.incoming());
const customer = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customers/customers/${customerId}`);
    customer.value = castResource(data);
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/customers/payments', { ...form, customer_id: customerId });
        router.push(routeUrl('customerPayments.show', castMutation(data).id));
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
    <AppLayout title="Create a Customer Payment" fluid>
        <Loader v-if="! loaded" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
                <CustomerDetails v-if="customer" :customer="customer" />

                <FullWidthBox title="Payment details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" placeholder="Select a payment method" :error="errors.payment_method_id" />
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" />
                        <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                        <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
                        <InputText v-model="form.reference" label="Reference" :error="errors.reference" />
                    </div>
                    <div class="mt-4">
                        <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                    </div>
                </FullWidthBox>
            </div>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('customers.show', customerId)" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Create payment' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
