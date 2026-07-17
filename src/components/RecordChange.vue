<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../helpers/api';
import { useNotificationsStore } from '../stores/notifications.js';
import AppLayout from '../layouts/AppLayout.vue';
import FullWidthBox from './FullWidthBox.vue';
import CustomerDetails from './CustomerDetails.vue';
import AsyncSelect from './Form/AsyncSelect.vue';
import InputText from './Form/InputText.vue';
import Textarea from './Form/Textarea.vue';
import Loader from './Loader.vue';

/**
 * Two-column change page: the record's current customer details on the left
 * (loaded from the API), a field-specific form on the right. The form submits
 * over the API to the existing update endpoint and, on success, navigates to
 * the record's show page.
 */
const props = defineProps({
    // One of: customer | agent | date | dueDate
    field: { type: String, required: true },
    title: { type: String, required: true },
    recordLabel: { type: String, default: '' },
    endpoints: { type: Object, required: true },
    current: { type: Object, default: () => ({}) },
});

const router = useRouter();
const notifications = useNotificationsStore();
const customer = ref(null);

onMounted(async () => {
    const { data } = await api.get(props.endpoints.customer);
    customer.value = data.data;
});

const form = reactive({
    customer_id: null,
    agent_id: props.current.agent?.id ?? null,
    new_date: props.field === 'dueDate' ? props.current.due_date : props.current.on_date,
    note: '',
});

const errors = ref({});
const submitting = ref(false);

function fieldError(name) {
    return errors.value[name]?.[0] ?? '';
}

async function submit() {
    if (submitting.value) {
        return;
    }

    submitting.value = true;
    errors.value = {};

    const payload = {
        customer: { customer_id: form.customer_id },
        agent: { agent_id: form.agent_id },
        date: { new_date: form.new_date },
        dueDate: { new_date: form.new_date, note: form.note },
    }[props.field];

    try {
        const { data } = await api.put(props.endpoints.submit, payload);
        notifications.push({ type: 'success', message: data.message ?? 'Saved.' });
        router.push(props.endpoints.redirect);
    } catch (error) {
        submitting.value = false;

        if (error.response?.status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else {
            notifications.push({ type: 'error', message: 'Could not save the change.' });
            throw error;
        }
    }
}
</script>

<template>
    <AppLayout :title="title">
        <div class="grid gap-4 md:grid-cols-2">
            <FullWidthBox title="Current customer" :collapsible="false">
                <CustomerDetails v-if="customer" :customer="customer" />
                <Loader v-else />
            </FullWidthBox>

            <FullWidthBox :title="title" :collapsible="false">
                <form class="space-y-4" @submit.prevent="submit">
                    <AsyncSelect
                        v-if="field === 'customer'"
                        v-model="form.customer_id"
                        :url="endpoints.customersSearch"
                        label="New Customer"
                        placeholder="Search customers…"
                        :error="fieldError('customer_id')"
                    />

                    <AsyncSelect
                        v-else-if="field === 'agent'"
                        v-model="form.agent_id"
                        :url="endpoints.agentsSearch"
                        label="New Agent"
                        placeholder="Search agents…"
                        :initial-option="current.agent"
                        :error="fieldError('agent_id')"
                    />

                    <template v-else-if="field === 'date'">
                        <InputText label="New date" v-model="form.new_date" placeholder="dd.mm.yyyy" :error="fieldError('new_date')" />
                    </template>

                    <template v-else-if="field === 'dueDate'">
                        <InputText label="New Due Date" v-model="form.new_date" placeholder="dd.mm.yyyy" :error="fieldError('new_date')" />
                        <Textarea label="Note" v-model="form.note" :rows="3" :error="fieldError('note')" />
                    </template>

                    <div class="flex items-center gap-2">
                        <button
                            type="submit"
                            class="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                            :disabled="submitting"
                        >
                            {{ submitting ? 'Saving…' : 'Save' }}
                        </button>
                        <RouterLink :to="endpoints.redirect" class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            Cancel
                        </RouterLink>
                    </div>
                </form>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
