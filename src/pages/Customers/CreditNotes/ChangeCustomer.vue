<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the customer of a customer credit note. Loads the credit note to
 * prefill the "current customer" panel, then hands off to the shared
 * RecordChange component which PUTs to the customer endpoint.
 */
const route = useRoute();
const creditNote = ref(null);

const endpoints = computed(() => ({
    customersSearch: 'customers/customers/autosuggest',
    submit: `/customers/credit-notes/${creditNote.value.id}/customer`,
    redirect: `/customers/credit-notes/${creditNote.value.id}`,
}));

onMounted(async () => {
    const { data } = await api.get(`/customers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
});
</script>

<template>
    <Loader v-if="! creditNote" />
    <RecordChange
        v-else
        field="customer"
        :title="`Change customer for credit note: ${creditNote.gen_id}`"
        :record-label="creditNote.gen_id"
        :endpoints="endpoints"
        :customer="creditNote.customer"
    />
</template>
