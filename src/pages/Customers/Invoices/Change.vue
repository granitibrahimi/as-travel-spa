<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change one field of a customer invoice (customer, agent, date or due date).
 * Loads the invoice to prefill the form and the "current customer" panel, then
 * hands off to the shared RecordChange component which PUTs to the field's API
 * endpoint and navigates back to the invoice on success.
 */
const props = defineProps({
    // One of: customer | agent | date | dueDate
    field: { type: String, required: true },
});

const route = useRoute();
const invoice = ref(null);

// Customer details live under the /api/base base, not /api/v1, so build an
// absolute URL from the configured API origin (mirrors ProInvoices/Create.vue).
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;

const titles = {
    customer: 'Change customer for invoice',
    agent: 'Change agent for invoice',
    date: 'Change date for invoice',
    dueDate: 'Change due date for invoice',
};

const segments = {
    customer: 'customer',
    agent: 'agent',
    date: 'date',
    dueDate: 'due-date',
};

const endpoints = computed(() => ({
    customer: `customers/customers/${invoice.value.customer.id}/details`,
    customersSearch: 'customers/autosuggest',
    agentsSearch: 'users/autosuggest',
    submit: `/customers/invoices/${invoice.value.id}/${segments[props.field]}`,
    redirect: `/customers/invoices/${invoice.value.id}`,
}));

const current = computed(() => ({
    agent: invoice.value.agent_id ? { id: invoice.value.agent_id, name: invoice.value.agent } : null,
    on_date: invoice.value.on_date,
    due_date: invoice.value.due_date,
}));

onMounted(async () => {
    const { data } = await api.get(`/customers/invoices/${route.params.id}`);
    invoice.value = castResource(data);
});
</script>

<template>
    <Loader v-if="! invoice" />
    <RecordChange
        v-else
        :field="field"
        :title="`${titles[field]}: ${invoice.gen_id}`"
        :record-label="invoice.gen_id"
        :endpoints="endpoints"
        :current="current"
    />
</template>
