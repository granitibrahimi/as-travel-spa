<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the customer of a customer invoice. Loads the invoice to prefill the
 * "current customer" panel, then hands off to the shared RecordChange component
 * which PUTs to the customer endpoint and navigates back to the invoice.
 */
const route = useRoute();
const invoice = ref(null);

const endpoints = computed(() => ({
    customer: `customers/customers/${invoice.value.customer.id}/details`,
    customersSearch: 'customers/autosuggest',
    submit: `/customers/invoices/${invoice.value.id}/customer`,
    redirect: `/customers/invoices/${invoice.value.id}`,
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
        field="customer"
        :title="`Change customer for invoice: ${invoice.gen_id}`"
        :record-label="invoice.gen_id"
        :endpoints="endpoints"
    />
</template>
