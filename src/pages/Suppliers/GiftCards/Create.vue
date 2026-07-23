<script setup>
import {onMounted, reactive, ref} from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import api from '../../../helpers/api';
import { castResource, castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { todayApiDate } from '../../../helpers/date.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';

const route = useRoute();
const router = useRouter();

const supplierId = route.params.supplierId;

// Supplier gift cards require amount + notes + on_date (backend validates
// on_date as required date_format:d.m.Y); defaults to today.
const form = reactive({
    amount: null,
    on_date: todayApiDate(),
    notes: '',
});
const supplier = ref(null);

const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const {data} = await api.get(`/suppliers/${supplierId}`);
    supplier.value = castResource(data);
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
        const {data} = await api.post(`/suppliers/${supplierId}/gift-cards`, payload);
        router.push(routeUrl('supplierGiftCards.show', castMutation(data).id));
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
    <AppLayout title="Create a Supplier Gift Card" fluid>
        <Loader v-if="! loaded"/>

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails v-if="supplier" :supplier="supplier" />

                <FullWidthBox title="Gift card details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount"/>
                        <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date"/>
                    </div>
                    <div class="mt-4">
                        <Textarea v-model="form.notes" label="Notes *" :error="errors.notes"/>
                    </div>
                </FullWidthBox>
            </div>
            <footer
                class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('suppliers.show', supplierId)"
                            class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Create gift card' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
