<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

// The API stores dates in d.m.Y; the date input works in Y-m-d.

const form = reactive({
    name: '',
    holiday_date: '',
    description: '',
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/official-holidays/${id}`);
        const holiday = castResource(data);
        Object.assign(form, {
            name: holiday.name ?? '',
            holiday_date: holiday.holiday_date ?? '',
            description: holiday.description ?? '',
        });
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form };

    try {
        await (isEdit ? api.put(`/official-holidays/${id}`, payload) : api.post('/official-holidays', payload));
        router.push(routeUrl('officialHolidays.list'));
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
    <AppLayout :title="isEdit ? 'Edit official holiday' : 'New official holiday'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Holiday details" :collapsible="false">
                <div class="space-y-4">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <DateInput v-model="form.holiday_date" label="Date *" :error="errors.holiday_date" />
                    <Textarea v-model="form.description" label="Description" :error="errors.description" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('officialHolidays.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update holiday' : 'Create holiday') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
