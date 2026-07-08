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

const route = useRoute();
const router = useRouter();

const giftCardId = route.params.id;

const form = reactive({
    amount: null,
    notes: '',
});
const onDate = ref('');

const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customer-gift-cards/${giftCardId}`);
    const giftCard = data.data ?? data;
    form.amount = giftCard.amount;
    form.notes = giftCard.notes ?? '';
    onDate.value = giftCard.on_date ?? '';
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/customer-gift-cards/${giftCardId}`, { amount: form.amount, notes: form.notes });
        router.push(`/customer-gift-cards/${giftCardId}`);
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
    <AppLayout title="Edit gift card">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Gift card details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" />
                    <InputText :model-value="onDate" label="Date" disabled />
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes *" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="`/customer-gift-cards/${giftCardId}`" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update gift card' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
