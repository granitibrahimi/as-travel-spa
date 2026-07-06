<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
// Route param is the balance id (mirrors the platform's {vacationBalance} binding).
const id = route.params.userId;

const balance = ref(null);
const userId = ref(null);

const form = reactive({ days: null, reason: '' });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/vacations/${id}/balance`);
    balance.value = data.data;
    userId.value = data.data.user_id;
    form.days = data.data.this_year_days;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/vacations/${id}/balance`, form);
        router.push(`/vacations/requests?user=${userId.value}`);
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
    <AppLayout :title="balance ? `Vacation balance — ${balance.user}` : 'Vacation balance'">
        <Loader v-if="! balance" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox :title="`${balance.user} · ${balance.year}`" :collapsible="false">
                <div class="space-y-4">
                    <InputText v-model="form.days" type="number" label="This year's days *" :error="errors.days" />
                    <Textarea v-model="form.reason" label="Reason *" :error="errors.reason" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="`/vacations/requests?user=${userId}`" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Update balance' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
