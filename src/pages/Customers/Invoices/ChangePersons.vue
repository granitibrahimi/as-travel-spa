<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the persons a customer invoice counts for the employee bonus.
 * Loads the invoice to prefill the "current customer" panel and the current
 * count, then hands off to the shared RecordChange component which PUTs to the
 * persons endpoint.
 */
const route = useRoute();
const invoice = ref(null);

const endpoints = computed(() => ({
    submit: `/customers/invoices/${invoice.value.id}/persons`,
    redirect: `/customers/invoices/${invoice.value.id}`,
}));

const current = computed(() => ({
    persons: invoice.value.bonus_persons,
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
        field="persons"
        :title="`Change persons for invoice: ${invoice.gen_id}`"
        :record-label="invoice.gen_id"
        :endpoints="endpoints"
        :current="current"
        :customer="invoice.customer"
    />
</template>
