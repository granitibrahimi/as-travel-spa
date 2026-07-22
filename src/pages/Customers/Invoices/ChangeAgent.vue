<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the agent of a customer invoice. Loads the invoice to prefill the
 * "current customer" panel and the current agent, then hands off to the shared
 * RecordChange component which PUTs to the agent endpoint.
 */
const route = useRoute();
const invoice = ref(null);

const endpoints = computed(() => ({
    customer: `customers/customers/${invoice.value.customer.id}/details`,
    agentsSearch: 'users/autosuggest',
    submit: `/customers/invoices/${invoice.value.id}/agent`,
    redirect: `/customers/invoices/${invoice.value.id}`,
}));

const current = computed(() => ({
    agent: invoice.value.agent_id ? { id: invoice.value.agent_id, name: invoice.value.agent } : null,
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
        field="agent"
        :title="`Change agent for invoice: ${invoice.gen_id}`"
        :record-label="invoice.gen_id"
        :endpoints="endpoints"
        :current="current"
    />
</template>
