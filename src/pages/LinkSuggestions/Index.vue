<script setup>
import { computed } from 'vue';
import api from '../../helpers/api';
import { castPaginated } from '../../types/responses.js';
import { useListFilters } from '../../composables/useListFilters.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';
import Select from '../../components/Form/Select.vue';
import SuggestionCard from '../../components/LinkSuggestions/SuggestionCard.vue';

// Review queue: records the matching rules (and the AI, for unclear cases)
// think belong together. Agents link them or mark them "Not a match".
const { filters, response, loading, apply, goToPage, reload } = useListFilters(
    { kind: 1, strength: '', status: '' },
    async (params, { signal }) => castPaginated((await api.get('/link-suggestions', { params, signal })).data),
);

const tabs = computed(() => [
    { kind: 1, label: 'Requests → Travelers', count: response.value?.extra?.pending?.requests },
    { kind: 2, label: 'Travelers → Customers', count: response.value?.extra?.pending?.travelers },
]);

const relationTypes = computed(() => (response.value?.extra?.relation_types ?? []).map((t) => ({ value: t.id, label: t.name })));

const strengthOptions = [
    { value: 'strong', label: 'Strong matches' },
    { value: 'possible', label: 'Possible matches' },
];
const statusOptions = [
    { value: '1', label: 'Accepted' },
    { value: '2', label: 'Rejected' },
    { value: '4', label: 'Dismissed by AI' },
    { value: 'all', label: 'All' },
];

function pickTab(kind) {
    filters.kind = kind;
    apply();
}
</script>

<template>
    <AppLayout title="Suggested links" fluid>
        <FullWidthBox title="Suggested links" :collapsible="false">
            <p class="mb-4 text-sm text-gray-500">
                Requests, travelers and customers that probably belong together, found by matching phone numbers, emails, names and invoices.
                Unclear cases are checked by AI. Nothing is linked until you accept it.
            </p>

            <div class="mb-4 flex flex-wrap items-end gap-3 border-b border-gray-200">
                <button
                    v-for="tab in tabs"
                    :key="tab.kind"
                    type="button"
                    class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
                    :class="filters.kind === tab.kind ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'"
                    @click="pickTab(tab.kind)"
                >
                    {{ tab.label }}
                    <span v-if="tab.count" class="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{{ tab.count }}</span>
                </button>
                <div class="mb-2 ml-auto flex flex-wrap gap-3">
                    <div class="w-44"><Select v-model="filters.strength" :options="strengthOptions" placeholder="All matches" @update:model-value="apply" /></div>
                    <div class="w-44"><Select v-model="filters.status" :options="statusOptions" placeholder="To review" @update:model-value="apply" /></div>
                </div>
            </div>

            <Loader v-if="loading || ! response" />
            <p v-else-if="response.data.length === 0" class="py-10 text-center text-sm text-gray-400">Nothing to review here. New suggestions are added every night and when requests or travelers are saved.</p>
            <div v-else class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <SuggestionCard
                    v-for="suggestion in response.data"
                    :key="suggestion.id"
                    :suggestion="suggestion"
                    :relation-types="relationTypes"
                    @decided="reload"
                />
            </div>

            <ApiPagination v-if="response" :paginator="response.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>
    </AppLayout>
</template>
