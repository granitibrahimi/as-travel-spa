<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
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
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();

const customerId = route.params.customer;

const form = reactive({
    payment_method_id: null,
    amount: null,
    transaction_nr: '',
    on_date: '',
    notes: '',
});

const paymentMethodsRepo = usePaymentMethodsRepository();
// A reimbursement is money paid back out to the customer — outgoing methods only.
const paymentMethods = computed(() => paymentMethodsRepo.outgoing());
const availableAmount = ref(null);
const customer = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customers/customers/${customerId}`);
    customer.value = castResource(data);

    // The amount available to reimburse (customer's unlinked credit) comes from
    // its own endpoint; keep the loader up until it lands so the amount's max is
    // set before the form shows.
    const optionsResponse = await api.get('/customers/refunds/available-amount', {
        params: { customer_id: customerId ?? undefined },
    });
    availableAmount.value = castResource(optionsResponse.data).available_amount;

    // Nothing to reimburse: bounce back to the customer with a toast rather than
    // showing an empty form the user can't submit.
    if (Number(availableAmount.value) <= 0) {
        notifications.push({
            type: 'warning',
            message: 'This customer has nothing to reimburse.',
        });
        router.replace(routeUrl('customers.show', customerId));
        return;
    }

    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { customer_id: customerId, ...form };

    try {
        const { data } = await api.post('/customers/refunds', payload);
        router.push(routeUrl('customerRefunds.show', castMutation(data).id));
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

const cancelTo = routeUrl('customers.show', customerId);
</script>

<template>
    <AppLayout title="New reimbursement" fluid>
        <Loader v-if="! loaded" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails v-if="customer" :customer="customer" />

                <FullWidthBox title="Reimbursement details" :collapsible="false">
                    <p v-if="availableAmount !== null" class="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        Available for reimbursement: <span class="font-medium tabular-nums">{{ money(availableAmount) }}</span>
                    </p>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" min="0" :max="availableAmount ?? undefined" />
                        <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
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
                    {{ processing ? 'Saving…' : 'Create reimbursement' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
