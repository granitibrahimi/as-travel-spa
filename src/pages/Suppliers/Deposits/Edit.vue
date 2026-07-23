<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';

const route = useRoute();
const router = useRouter();

const depositId = route.params.id;

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
const supplier = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    const { data } = await api.get(`/supplier-deposits/${depositId}`);
    const deposit = castResource(data);
    supplier.value = deposit.supplier ?? null;
    Object.assign(form, {
        payment_method_id: deposit.payment_method_id,
        amount: deposit.amount,
        on_date: deposit.on_date ?? '',
        reference: deposit.reference ?? '',
        transaction_nr: deposit.transaction_nr ?? '',
        notes: deposit.notes ?? '',
    });

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
        await api.put(`/supplier-deposits/${depositId}`, payload);
        router.push(routeUrl('supplierDeposits.show', depositId));
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

const cancelTo = routeUrl('supplierDeposits.show', depositId);
</script>

<template>
    <AppLayout title="Edit deposit" fluid>
        <Loader v-if="! loaded" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails v-if="supplier" :supplier="supplier" />

                <FullWidthBox title="Deposit details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select v-model="form.payment_method_id" :options="paymentMethods" label="Payment method *" :error="errors.payment_method_id" />
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
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update deposit' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
