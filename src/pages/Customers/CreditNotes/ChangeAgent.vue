<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import Loader from '../../../components/Loader.vue';
import RecordChange from '../../../components/RecordChange.vue';

/**
 * Change the agent of a customer credit note. Loads the credit note to prefill
 * the "current customer" panel and the current agent, then hands off to the
 * shared RecordChange component which PUTs to the agent endpoint.
 */
const route = useRoute();
const creditNote = ref(null);

const endpoints = computed(() => ({
    agentsSearch: 'users/autosuggest',
    submit: `/customers/credit-notes/${creditNote.value.id}/agent`,
    redirect: `/customers/credit-notes/${creditNote.value.id}`,
}));

const current = computed(() => ({
    agent: creditNote.value.agent_id ? { id: creditNote.value.agent_id, name: creditNote.value.agent } : null,
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
        field="agent"
        :title="`Change agent for credit note: ${creditNote.gen_id}`"
        :record-label="creditNote.gen_id"
        :endpoints="endpoints"
        :current="current"
        :customer="creditNote.customer"
    />
</template>
