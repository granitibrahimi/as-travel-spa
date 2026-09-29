<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the supplier of a supplier payment. Loads the payment to prefill the
 * "current supplier" panel, then hands off to the shared RecordChange
 * component which PUTs to the supplier endpoint. The API refuses (422) while
 * the payment is linked to transactions.
 */
const route = useRoute();
const payment = ref(null);

const endpoints = computed(() => ({
    suppliersSearch: '/suppliers/suppliers/autosuggest',
    submit: `/suppliers/payments/${payment.value.id}/supplier`,
    redirect: `/suppliers/payments/${payment.value.id}`,
}));

onMounted(async () => {
    const { data } = await api.get(`/suppliers/payments/${route.params.id}`);
    payment.value = castResource(data);
});
</script>

<template>
    <Loader v-if="! payment" />
    <RecordChange
        v-else
        field="supplier"
        :title="`Change supplier for payment: ${payment.gen_id}`"
        :record-label="payment.gen_id"
        :endpoints="endpoints"
        :supplier="payment.supplier"
    />
</template>
