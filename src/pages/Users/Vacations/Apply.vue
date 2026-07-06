<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

// The apply endpoint validates dates as d.m.Y.
const toDmy = (value) => (value ? value.split('-').reverse().join('.') : value);

const vacationTypes = ref([]);
const balances = ref([]);
const activeRequest = ref(null);
const ready = ref(false);

const form = reactive({
    type: null,
    from: '',
    to: '',
    my_working_weekend: false,
    description: '',
});
const errors = ref({});
const processing = ref(false);
const cancelling = ref(false);

async function loadOptions() {
    const { data } = await api.get('/vacations/apply');
    vacationTypes.value = data.vacationTypes;
    balances.value = data.balances.data ?? data.balances;
    activeRequest.value = data.activeRequest;
    form.type = vacationTypes.value[0]?.value ?? null;
    ready.value = true;
}

onMounted(() => loadOptions());

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post('/vacations/apply', {
            type: form.type,
            from: toDmy(form.from),
            to: toDmy(form.to),
            description: form.description,
            my_working_weekend: form.my_working_weekend ? 1 : 0,
        });
        ready.value = false;
        await loadOptions();
        form.from = '';
        form.to = '';
        form.description = '';
        form.my_working_weekend = false;
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

async function cancelActive() {
    if (cancelling.value) {
        return;
    }

    cancelling.value = true;

    try {
        await api.post('/vacations/cancel-self-request');
        ready.value = false;
        await loadOptions();
    } finally {
        cancelling.value = false;
    }
}
</script>

<template>
    <AppLayout title="Apply for vacation">
        <Loader v-if="! ready" />
        <div v-else-if="auth.can('vacations.applyForm')" class="space-y-6">
            <FullWidthBox title="Your balance" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center">Year</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">This year</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Leftover</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Used</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="balance in balances" :key="balance.year">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ balance.year }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ balance.this_year_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ balance.leftover_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ balance.days_used }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center font-semibold">{{ balance.days_left }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="activeRequest" title="Pending request" :collapsible="false">
                <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-700">
                        {{ activeRequest.type_label }} · {{ activeRequest.from }} → {{ activeRequest.to }}
                        ({{ activeRequest.working_days }} days) — <span class="font-medium text-amber-700">{{ activeRequest.status_label }}</span>
                    </p>
                    <Button v-if="auth.can('vacations.cancelSelfRequest')" variant="danger" size="sm" :disabled="cancelling" @click="cancelActive">
                        {{ cancelling ? 'Cancelling…' : 'Cancel request' }}
                    </Button>
                </div>
            </FullWidthBox>

            <form v-else class="space-y-6" @submit.prevent="submit">
                <FullWidthBox title="New request" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select v-model="form.type" :options="vacationTypes" label="Type *" :placeholder="null" :error="errors.type" />
                        <div class="hidden md:block" />
                        <InputText v-model="form.from" type="date" label="From *" :error="errors.from" />
                        <InputText v-model="form.to" type="date" label="To *" :error="errors.to" />
                    </div>
                    <NiceCheckbox v-model="form.my_working_weekend" label="Includes a working weekend" class="mt-4" />
                    <div class="mt-4">
                        <Textarea v-model="form.description" label="Description" :error="errors.description" />
                    </div>
                </FullWidthBox>

                <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                    <Button type="submit" variant="primary" :disabled="processing">
                        {{ processing ? 'Submitting…' : 'Submit request' }}
                    </Button>
                </footer>
            </form>
        </div>
    </AppLayout>
</template>
