<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate } from '../../../helpers/date';
import Textarea from '../../../components/Form/Textarea.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';

const router = useRouter();

const formOptions = useFormOptionsStore();
const paymentMethods = computed(() => toOptions(formOptions.paymentMethods));
const ready = ref(false);
const errors = ref({});
const processing = ref(false);

const form = reactive({
    payment_method_id: null,
    amount: null,
    date: todayApiDate(),
    notes: '',
});

onMounted(() => {
    ready.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/petty-cash/deposit-from-bank', form);
        router.push(routeUrl('accountTransfers.show', castMutation(data).id));
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
    <AppLayout title="Bank → Petty Cash" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Bank → Petty Cash" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" placeholder="Bank account…" label="From bank account *" :error="errors.payment_method_id" />
                    <InputText v-model="form.amount" type="number" step="0.01" label="Amount *" :error="errors.amount" />
                    <DateInput v-model="form.date" label="Date *" :error="errors.date" />
                    <div class="md:col-span-3">
                        <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('pettyCash.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create transfer' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
