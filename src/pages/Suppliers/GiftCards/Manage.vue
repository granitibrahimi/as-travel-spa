<script setup>
import { onMounted, reactive, ref } from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
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

const giftCardId = route.params.id ?? null;
const supplierId = route.params.supplierId ?? null;
const isEdit = Boolean(giftCardId);

const form = reactive({
    amount: null,
    on_date: '',            // <input type=date> value, Y-m-d
    notes: '',
});

const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

// Backend speaks d.m.Y; the date input speaks Y-m-d.

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/supplier-gift-cards/${giftCardId}`);
        const giftCard = data.data ?? data;
        Object.assign(form, {
            amount: giftCard.amount,
            on_date: giftCard.on_date ?? '',
            notes: giftCard.notes ?? '',
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

    const payload = { ...form };

    try {
        if (isEdit) {
            await api.put(`/supplier-gift-cards/${giftCardId}`, payload);
            router.push(`/supplier-gift-cards/${giftCardId}`);
        } else {
            const { data } = await api.post(`/suppliers/${supplierId}/gift-cards`, payload);
            router.push(`/supplier-gift-cards/${data.id}`);
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

const cancelTo = isEdit ? `/supplier-gift-cards/${giftCardId}` : `/suppliers/${supplierId}`;
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit gift card' : 'New gift card'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Gift card details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputNumber v-model="form.amount" label="Amount *" :error="errors.amount" />
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date" :disabled="isEdit" />
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes *" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update gift card' : 'Create gift card') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
