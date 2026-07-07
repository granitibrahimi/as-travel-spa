<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';

const route = useRoute();
const router = useRouter();

const depositId = route.params.id ?? null;
const supplierId = route.params.supplierId ?? null;
const isEdit = Boolean(depositId);

const form = reactive({
    payment_method_id: null,
    amount: null,
    on_date: '',            // <input type=date> value, Y-m-d
    reference: '',
    transaction_nr: '',
    notes: '',
});

const paymentMethods = ref([]);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.
const toApiDate = (ymd) => (ymd ? ymd.split('-').reverse().join('.') : '');
const toInputDate = (dmy) => (dmy ? dmy.split('.').reverse().join('-') : '');

onMounted(async () => {
    const { data: options } = await api.get('/supplier-deposits/form-options');
    paymentMethods.value = options.payment_methods ?? [];

    if (isEdit) {
        const { data } = await api.get(`/supplier-deposits/${depositId}`);
        const deposit = data.data ?? data;
        Object.assign(form, {
            payment_method_id: deposit.payment_method_id,
            amount: deposit.amount,
            on_date: toInputDate(deposit.on_date),
            reference: deposit.reference ?? '',
            transaction_nr: deposit.transaction_nr ?? '',
            notes: deposit.notes ?? '',
        });
    }

    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form, on_date: toApiDate(form.on_date) };

    try {
        if (isEdit) {
            await api.put(`/supplier-deposits/${depositId}`, payload);
            router.push(`/supplier-deposits/${depositId}`);
        } else {
            const { data } = await api.post(`/suppliers/${supplierId}/deposits`, payload);
            router.push(`/supplier-deposits/${data.id}`);
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

const cancelTo = isEdit ? `/supplier-deposits/${depositId}` : `/suppliers/${supplierId}`;
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit deposit' : 'New deposit'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Deposit details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
                    <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" />
                    <InputText v-model="form.on_date" type="date" label="Date *" :error="errors.on_date" />
                    <InputText v-model="form.transaction_nr" label="Transaction #" :error="errors.transaction_nr" />
                    <InputText v-model="form.reference" label="Reference" :error="errors.reference" />
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update deposit' : 'Create deposit') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
