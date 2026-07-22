<script setup>
import {onMounted, reactive, ref} from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const router = useRouter();

const giftCardId = route.params.id;

// Customer gift cards only accept amount + notes; on_date is server-set to now().
const form = reactive({
    amount: null,
    notes: '',
});
const onDate = ref('');
const customer = ref(null);

const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const {data} = await api.get(`/customers/gift-cards/${giftCardId}`);
    const giftCard = castResource(data);
    form.amount = giftCard.amount;
    form.notes = giftCard.notes ?? '';
    onDate.value = giftCard.on_date ?? '';
    customer.value = giftCard.customer ?? null;
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {
        amount: form.amount,
        notes: form.notes,
    };

    try {
        await api.put(`/customers/gift-cards/${giftCardId}`, payload);
        router.push(routeUrl('customerGiftCards.show', giftCardId));
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
    <AppLayout title="Edit gift card" fluid>
        <Loader v-if="! loaded"/>

        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails v-if="customer" :customer="customer" />

                <FullWidthBox title="Gift card details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount"/>
                        <InputText :model-value="onDate" label="Date" disabled/>
                    </div>
                    <div class="mt-4">
                        <Textarea v-model="form.notes" label="Notes *" :error="errors.notes"/>
                    </div>
                </FullWidthBox>
            </div>
            <footer
                class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('customerGiftCards.show', giftCardId)"
                            class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update gift card' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
