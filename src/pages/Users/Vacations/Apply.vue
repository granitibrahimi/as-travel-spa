<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import SideOverlay from '../../../components/SideOverlay.vue';

const auth = useAuthStore();
const formOptions = useFormOptionsStore();

// The apply endpoint validates dates as d.m.Y.

const vacationTypes = computed(() => toOptions(formOptions.vacationRequestTypes));
const balance = ref(null);
const otherRequests = ref([]);
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
const showCalculation = ref(false);

// Human label for a single day in the calculation breakdown.
function dayNote(day) {
    if (day.isHoliday) {
        return typeof day.isHoliday === 'string' ? day.isHoliday : 'Holiday';
    }
    if (day.isWorkingWeekend) {
        return 'Working weekend';
    }
    if (day.isWeekend) {
        return 'Weekend';
    }
    return 'Working day';
}

async function loadOptions() {
    const { data } = await api.get('/users/vacations/apply');
    const resource = castResource(data);
    balance.value = resource.balance ?? null;
    otherRequests.value = resource.otherRequests ?? [];
    activeRequest.value = resource.activeRequest;
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
        await api.post('/users/vacations/apply', {
            type: form.type,
            from: form.from,
            to: form.to,
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
        await api.post('/users/vacations/cancel-self-request');
        ready.value = false;
        await loadOptions();
    } finally {
        cancelling.value = false;
    }
}
</script>

<template>
    <AppLayout title="Apply for vacation" fluid>
        <Loader v-if="! ready" />
        <div v-else-if="auth.can('vacations.applyForm')" class="space-y-6">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <!-- Left (wide): the active request / apply form — unchanged. -->
                <div class="space-y-6 lg:col-span-2">
                    <FullWidthBox v-if="activeRequest" :title="`Active Request | ID: ${activeRequest.id}`" :collapsible="false">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <tbody>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Period</th>
                                    <td class="border border-gray-300 px-4 py-3">{{ activeRequest.from }} - {{ activeRequest.to }}</td>
                                </tr>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Days</th>
                                    <td class="border border-gray-300 px-4 py-3">{{ activeRequest.working_days }}</td>
                                </tr>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Type</th>
                                    <td class="border border-gray-300 px-4 py-3">{{ activeRequest.type ?? activeRequest.type_label }}</td>
                                </tr>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                    <td class="border border-gray-300 px-4 py-3 font-medium">{{ activeRequest.status ?? 'Open' }}</td>
                                </tr>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Description</th>
                                    <td class="border border-gray-300 px-4 py-3">{{ activeRequest.description || '—' }}</td>
                                </tr>
                                <tr>
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Requested at</th>
                                    <td class="border border-gray-300 px-4 py-3">{{ activeRequest.on_date }}</td>
                                </tr>
                                <tr v-if="activeRequest.calculation">
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">View calculation</th>
                                    <td class="border border-gray-300 px-4 py-3">
                                        <Button variant="secondary" size="sm" @click="showCalculation = true">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
                                            </svg>
                                            Calculation
                                        </Button>
                                    </td>
                                </tr>
                                <tr v-if="auth.can('vacations.cancelSelfRequest')">
                                    <th class="w-48 border border-gray-300 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600">Cancel</th>
                                    <td class="border border-gray-300 px-4 py-3">
                                        <Button variant="danger" size="sm" :disabled="cancelling" @click="cancelActive">
                                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
                                            </svg>
                                            {{ cancelling ? 'Cancelling…' : 'Cancel' }}
                                        </Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </FullWidthBox>

                    <form v-else class="space-y-6" @submit.prevent="submit">
                        <FullWidthBox title="New request" :collapsible="false">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Select v-model="form.type" :options="vacationTypes" label="Type *" placeholder="Please select a type" :error="errors.type" />
                                <div class="hidden md:block" />
                                <DateInput v-model="form.from" label="From *" :error="errors.from" />
                                <DateInput v-model="form.to" label="To *" :error="errors.to" />
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

                <!-- Right (narrow): this-year balance. -->
                <div class="lg:col-span-1">
                    <FullWidthBox title="Balance" :collapsible="false">
                        <table v-if="balance" class="w-full border-collapse text-sm">
                            <tbody>
                                <tr class="odd:bg-gray-50">
                                    <td class="border border-gray-200 px-3 py-2 text-gray-600">Leftover days from {{ balance.year - 1 }}</td>
                                    <td class="border border-gray-200 px-3 py-2 text-right font-medium">{{ balance.leftover_days }}</td>
                                </tr>
                                <tr class="odd:bg-gray-50">
                                    <td class="border border-gray-200 px-3 py-2 text-gray-600">Days for this year {{ balance.year }}</td>
                                    <td class="border border-gray-200 px-3 py-2 text-right font-medium">{{ balance.this_year_days }}</td>
                                </tr>
                                <tr class="odd:bg-gray-50">
                                    <td class="border border-gray-200 px-3 py-2 text-gray-600">Working days used</td>
                                    <td class="border border-gray-200 px-3 py-2 text-right font-medium">{{ balance.days_used }}</td>
                                </tr>
                                <tr class="odd:bg-gray-50">
                                    <td class="border border-gray-200 px-3 py-2 text-gray-600">Working days left</td>
                                    <td class="border border-gray-200 px-3 py-2 text-right font-semibold">{{ balance.days_left }}</td>
                                </tr>
                                <tr class="odd:bg-gray-50">
                                    <td class="border border-gray-200 px-3 py-2 text-gray-600">Other days used</td>
                                    <td class="border border-gray-200 px-3 py-2 text-right font-medium">{{ balance.other_days_used }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else class="text-sm text-gray-400">No balance available.</p>
                    </FullWidthBox>
                </div>
            </div>

            <!-- Full width: older vacation requests. -->
            <FullWidthBox title="Older vacation requests" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2">From</th>
                                <th class="border border-gray-300 px-2 py-2">To</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Days</th>
                                <th class="border border-gray-300 px-2 py-2">Status</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="otherRequests.length === 0">
                                <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No previous requests.</td>
                            </tr>
                            <tr v-for="request in otherRequests" :key="request.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ request.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.from }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.to }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ request.working_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-bold">{{ request.status }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.type }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.description || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.responder?.name ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <SideOverlay
                :show="showCalculation"
                :title="activeRequest ? `Calculation | ID: ${activeRequest.id}` : 'Calculation'"
                :subtitle="activeRequest ? `${activeRequest.from} - ${activeRequest.to}` : ''"
                @close="showCalculation = false"
            >
                <table v-if="activeRequest?.calculation" class="w-full border-collapse text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border-b border-gray-200 px-2 py-2 text-center">#</th>
                            <th class="border-b border-gray-200 px-2 py-2">Date</th>
                            <th class="border-b border-gray-200 px-2 py-2">Day</th>
                            <th class="border-b border-gray-200 px-2 py-2">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="day in activeRequest.calculation.dates" :key="day.date" :class="day.day == null ? 'text-gray-400' : ''">
                            <td class="border-b border-gray-100 px-2 py-1.5 text-center tabular-nums">{{ day.day ?? '—' }}</td>
                            <td class="whitespace-nowrap border-b border-gray-100 px-2 py-1.5">{{ day.date }}</td>
                            <td class="border-b border-gray-100 px-2 py-1.5">{{ day.dayName }}</td>
                            <td class="border-b border-gray-100 px-2 py-1.5">{{ dayNote(day) }}</td>
                        </tr>
                    </tbody>
                </table>

                <template #footer>
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Total working days</span>
                        <span class="text-sm font-semibold tabular-nums">{{ activeRequest?.calculation?.workingDays }}</span>
                    </div>
                </template>
            </SideOverlay>
        </div>
    </AppLayout>
</template>
