<script setup>
import { reactive, ref, watch } from 'vue';
import api from '../../../helpers/api.js';
import { todayApiDate } from '../../../helpers/date.js';
import SideOverlay from '../../../components/SideOverlay.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';

/**
 * Record a vacation on behalf of a user (admin entry). POSTs to
 * `/users/vacations` — the request is stored already responded-to (responder =
 * current admin), so there is no "Open" status option here. When the status is
 * Approved the backend recalculates the user's balance, so the parent should
 * refetch after `@saved`.
 */
const props = defineProps({
    show: { type: Boolean, default: false },
    userId: { type: [Number, String], default: null },
    userName: { type: String, default: '' },
});

const emit = defineEmits(['close', 'saved']);

// Numeric values mirror the platform enums (VacationRequestTypeEnum /
// VacationRequestStatusEnum). Open (1) is intentionally omitted.
const typeOptions = [
    { value: 1, label: 'Paid vacation' },
    { value: 2, label: 'Sick leave' },
    { value: 3, label: 'Special leave' },
];
const statusOptions = [
    { value: 2, label: 'Approved' },
    { value: 3, label: 'Rejected' },
    { value: 4, label: 'Canceled' },
    { value: 5, label: 'Self-canceled' },
];

const form = reactive({
    type: 1,
    from: todayApiDate(),
    to: todayApiDate(),
    status: 2,
    response: '',
    working_weekend: false,
});
const errors = ref({});
const processing = ref(false);

function reset() {
    form.type = 1;
    form.from = todayApiDate();
    form.to = todayApiDate();
    form.status = 2;
    form.response = '';
    form.working_weekend = false;
    errors.value = {};
    processing.value = false;
}

watch(() => props.show, (open) => {
    if (open) {
        reset();
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post('/users/vacations', {
            user_id: props.userId,
            type: form.type,
            from: form.from,
            to: form.to,
            status: form.status,
            response: form.response,
            working_weekend: form.working_weekend ? 1 : 0,
        });
        emit('saved');
        emit('close');
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
    <SideOverlay
        :show="show"
        title="Add vacation"
        :subtitle="userName"
        @close="emit('close')"
    >
        <form class="space-y-4" @submit.prevent="submit">
            <Select v-model="form.type" :options="typeOptions" label="Type *" :placeholder="null" :error="errors.type" />
            <DateInput v-model="form.from" label="From *" :error="errors.from" />
            <DateInput v-model="form.to" label="To *" :error="errors.to" />
            <Select v-model="form.status" :options="statusOptions" label="Status *" :placeholder="null" :error="errors.status" />
            <Textarea v-model="form.response" label="Response *" :rows="3" :error="errors.response" />
            <NiceCheckbox v-model="form.working_weekend" label="Includes a working weekend" />
        </form>

        <template #footer>
            <div class="flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" :disabled="processing" @click="emit('close')">Cancel</Button>
                <Button variant="primary" size="sm" :disabled="processing" @click="submit">
                    {{ processing ? 'Saving…' : 'Save vacation' }}
                </Button>
            </div>
        </template>
    </SideOverlay>
</template>
