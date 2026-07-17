<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

// The update endpoint validates dates as d.m.Y.

const vacationTypes = ref([]);
const userId = ref(null);
const ready = ref(false);

const form = reactive({
    type: null,
    from: '',
    to: '',
    working_weekend: false,
    description: '',
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/vacations/${id}/edit`);
    vacationTypes.value = data.vacationTypes;
    userId.value = data.data.user_id;
    Object.assign(form, {
        type: data.data.type,
        from: data.data.from,
        to: data.data.to,
        working_weekend: data.data.working_weekend ?? false,
        description: data.data.description ?? '',
    });
    ready.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/vacations/${id}`, {
            type: form.type,
            from: form.from,
            to: form.to,
            working_weekend: form.working_weekend ? 1 : 0,
            description: form.description,
        });
        router.push(`/vacations/${id}`);
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
    <AppLayout title="Edit vacation request">
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Request" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.type" :options="vacationTypes" label="Type *" :placeholder="null" :error="errors.type" />
                    <div class="hidden md:block" />
                    <DateInput v-model="form.from" label="From *" :error="errors.from" />
                    <DateInput v-model="form.to" label="To *" :error="errors.to" />
                </div>
                <NiceCheckbox v-model="form.working_weekend" label="Includes a working weekend" class="mt-4" />
                <div class="mt-4">
                    <Textarea v-model="form.description" label="Description" :error="errors.description" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="`/vacations/${id}`" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Update request' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
