<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castPaginated } from '../../types/responses.js';
import { useAuthStore } from '../../stores/auth';
import FullWidthBox from '../FullWidthBox.vue';
import SuggestionCard from './SuggestionCard.vue';

// Pending suggestions for the record a page shows (a request or a traveler).
// Hidden when there are none or the user can't review suggestions.
const props = defineProps({
    // API filter, e.g. { simple_task_id: 12 } or { person_id: 5 }.
    params: { type: Object, required: true },
    context: { type: String, required: true },
    title: { type: String, default: 'Suggested links' },
});

const emit = defineEmits(['linked']);

const auth = useAuthStore();
const suggestions = ref([]);
const relationTypes = ref([]);
const canReview = computed(() => auth.can('linkSuggestions.review'));

async function load() {
    if (! canReview.value) {
        return;
    }
    const { data } = await api.get('/link-suggestions', { params: { ...props.params, per_page: 10 } });
    const list = castPaginated(data);
    suggestions.value = list.data;
    relationTypes.value = (list.extra.relation_types ?? []).map((t) => ({ value: t.id, label: t.name }));
}

async function decided({ action }) {
    await load();
    if (action === 'accept') {
        emit('linked');
    }
}

onMounted(load);
watch(() => props.params, load, { deep: true });

defineExpose({ load });
</script>

<template>
    <FullWidthBox v-if="canReview && suggestions.length" :title="title" :collapsible="false">
        <template #actions>
            <RouterLink :to="routeUrl('linkSuggestions.list')" class="text-sm text-gray-500 hover:text-red-600 hover:underline">All suggestions</RouterLink>
        </template>
        <div class="space-y-3">
            <SuggestionCard
                v-for="suggestion in suggestions"
                :key="suggestion.id"
                :suggestion="suggestion"
                :relation-types="relationTypes"
                :context="context"
                @decided="decided"
            />
        </div>
    </FullWidthBox>
</template>
