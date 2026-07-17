<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import api from '../../../helpers/api.js';
import { todayApiDate } from '../../../helpers/date.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import SuccessDialog from '../../../components/SuccessDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const customerId = route.params.customer;

const customer = ref(null);

const form = reactive({
    amount: null,
    on_date: todayApiDate(),
    flight_info: '',
    hotel_info: '',
});

const errors = ref({});
const processing = ref(false);
const success = ref(false);

onMounted(async () => {
    const { data } = await api.get('customers/' + customerId);
    customer.value = data.data ?? data;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post(`/customers/${customerId}/pro-invoices`, form);
        success.value = true;
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

function done() {
    success.value = false;
    router.push(`/customers/${customerId}`);
}
</script>

<template>
    <AppLayout :title="customer ? `New pro-invoice · ${customer.full_name}` : 'New pro-invoice'" fluid>
        <div v-if="! auth.can('customerProInvoices.create')" />

        <Loader v-else-if="! customer" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
                <FullWidthBox title="Customer" :collapsible="false">
                    <CustomerDetails :customer="customer" />
                </FullWidthBox>

                <FullWidthBox :title="`Pro-invoice for ${customer.full_name}`" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputNumber v-model="form.amount" label="Amount *" :min="0" step="0.01" :error="errors.amount" />
                        <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" />
                    </div>

                    <div class="mt-4 space-y-4">
                        <Textarea v-model="form.flight_info" label="Flight info" :rows="4" :error="errors.flight_info" />
                        <Textarea v-model="form.hotel_info" label="Hotel info" :rows="4" :error="errors.hotel_info" />
                    </div>
                </FullWidthBox>
            </div>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <Button :href="`/customers/${customerId}`" @click.prevent="router.push(`/customers/${customerId}`)">Cancel</Button>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create pro-invoice' }}
                </Button>
            </footer>
        </form>

        <SuccessDialog
            :show="success"
            title="Pro-invoice created"
            message="The pro-invoice was created successfully."
            @close="done"
        />
    </AppLayout>
</template>
