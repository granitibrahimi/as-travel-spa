<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the supplier of a supplier credit note. Loads the credit note to prefill the
 * "current supplier" panel, then hands off to the shared RecordChange
 * component which PUTs to the supplier endpoint. The API refuses (422) while
 * the credit note is linked to transactions.
 */
const route = useRoute();
const creditNote = ref(null);

const endpoints = computed(() => ({
    suppliersSearch: '/suppliers/suppliers/autosuggest',
    submit: `/suppliers/credit-notes/${creditNote.value.id}/supplier`,
    redirect: `/suppliers/credit-notes/${creditNote.value.id}`,
}));

onMounted(async () => {
    const { data } = await api.get(`/suppliers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
});
</script>

<template>
    <Loader v-if="! creditNote" />
    <RecordChange
        v-else
        field="supplier"
        :title="`Change supplier for credit note: ${creditNote.gen_id}`"
        :record-label="creditNote.gen_id"
        :endpoints="endpoints"
        :supplier="creditNote.supplier"
    />
</template>
