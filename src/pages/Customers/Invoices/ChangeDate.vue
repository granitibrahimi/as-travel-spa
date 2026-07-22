<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the date of a customer invoice. Loads the invoice to prefill the
 * "current customer" panel and the current date, then hands off to the shared
 * RecordChange component which PUTs to the date endpoint.
 */
const route = useRoute();
const invoice = ref(null);

const endpoints = computed(() => ({
    customer: `customers/customers/${invoice.value.customer.id}/details`,
    submit: `/customers/invoices/${invoice.value.id}/date`,
    redirect: `/customers/invoices/${invoice.value.id}`,
}));

const current = computed(() => ({
    on_date: invoice.value.on_date,
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
        field="date"
        :title="`Change date for invoice: ${invoice.gen_id}`"
        :record-label="invoice.gen_id"
        :endpoints="endpoints"
        :current="current"
    />
</template>
