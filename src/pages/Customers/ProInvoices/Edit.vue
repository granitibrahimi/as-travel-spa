<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const proInvoiceId = route.params.id;

const proInvoice = ref(null);

const form = reactive({
    amount: null,
    on_date: '',
    flight_info: '',
    hotel_info: '',
});

const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customers/pro-invoices/${proInvoiceId}`);
    const record = castResource(data);
    proInvoice.value = record;

    form.amount = record.amount;
    form.on_date = record.on_date ?? '';
    form.flight_info = record.flight_info ?? '';
    form.hotel_info = record.hotel_info ?? '';
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/customers/pro-invoices/${proInvoiceId}`, { ...form });
        router.push(routeUrl('customerProInvoices.show', proInvoiceId));
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
    <AppLayout :title="proInvoice ? `Edit pro-invoice ${proInvoice.gen_id}` : 'Edit pro-invoice'" fluid>
        <div v-if="! auth.can('customerProInvoices.edit')" />

        <Loader v-else-if="! proInvoice" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
                <FullWidthBox title="Customer" :collapsible="false">
                    <CustomerDetails v-if="proInvoice.customer" :customer="proInvoice.customer" />
                    <p v-else class="text-sm text-gray-400">No customer linked.</p>
                </FullWidthBox>

                <FullWidthBox title="Pro-invoice details" :collapsible="false">
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
                <RouterLink :to="routeUrl('customerProInvoices.show', proInvoiceId)" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Update pro-invoice' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
