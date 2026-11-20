<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castMutation, castResource } from '../../types/responses.js';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import Textarea from '../../components/Form/Textarea.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import DestinationsSection from './DestinationsSection.vue';
import CustomerSection from './CustomerSection.vue';
import { emptyContactFields, requestPayload } from './customerContact.js';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({ ...emptyContactFields(), source: null, type: null, description: '', assigned_to: null, urgent: false, from_flamur: false, from_vesa: false, combo: false, specific_hotel: '' });
const destinations = ref([]);
const options = ref({ statuses: [], sources: [], types: [], agents: [], relation_types: [] });
const errors = ref({});
const processing = ref(false);

const sourceOptions = computed(() => options.value.sources.map((s) => ({ value: s.id, label: s.name })));
const typeOptions = computed(() => (options.value.types ?? []).map((t) => ({ value: t.id, label: t.name })));
const agentOptions = computed(() => options.value.agents.map((a) => ({ value: a.id, label: a.name })));

// Agents who handled this traveler's (or their customer's) earlier requests.
const suggestedAgents = ref([]);
watch(
    () => [form.person_contact_reference_id, form.connect_customer ? form.customer_id : null],
    async ([referenceId, customerId]) => {
        if (! auth.can('simpleTasks.assign') || (! referenceId && ! customerId)) {
            suggestedAgents.value = [];

            return;
        }
        const { data } = await api.get('/simple-tasks/suggested-agents', {
            params: { person_contact_reference_id: referenceId ?? undefined, customer_id: customerId ?? undefined },
        });
        suggestedAgents.value = castResource(data) ?? [];
    },
);

onMounted(async () => {
    const { data } = await api.get('/simple-tasks/options');
    options.value = castResource(data);
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/simple-tasks', {
            ...requestPayload(form, options.value.sources),
            parent_destination_ids: destinations.value.map((d) => d.id),
        });
        router.push(routeUrl('simpleTasks.show', castMutation(data).id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="New request">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Customer" :collapsible="false">
                <div class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select v-model="form.source" label="Source *" :options="sourceOptions" :error="errors.source" />
                    </div>
                    <CustomerSection :form="form" :errors="errors" :sources="options.sources" :relation-types="options.relation_types ?? []" />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Request details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.type" label="Type *" :options="typeOptions" :error="errors.type" />
                    <Select
                        v-if="auth.can('simpleTasks.assign')"
                        v-model="form.assigned_to"
                        label="Assign to"
                        :options="agentOptions"
                        placeholder="Not assigned"
                        :error="errors.assigned_to"
                    />
                    <p v-else-if="auth.can('simpleTasks.receive')" class="self-end pb-2 text-sm text-gray-500">This request will be assigned to you.</p>
                    <div v-if="suggestedAgents.length" class="rounded border border-amber-200 bg-amber-50 px-3 py-2 md:col-span-2">
                        <p class="text-xs font-medium uppercase text-amber-800">Suggested agent</p>
                        <div class="mt-1 flex flex-wrap gap-2">
                            <div v-for="agent in suggestedAgents" :key="agent.id" class="flex items-center gap-2 rounded border border-amber-200 bg-white px-2.5 py-1.5 text-sm">
                                <span>
                                    <span class="font-medium">{{ agent.name }}</span>
                                    <span class="ml-1 text-xs text-gray-500">{{ agent.requests }} {{ agent.requests === 1 ? 'request' : 'requests' }} with this customer<template v-if="agent.last_at">, last {{ agent.last_at }}</template></span>
                                </span>
                                <span v-if="form.assigned_to === agent.id" class="text-xs font-medium text-green-700">Assigned ✓</span>
                                <button v-else type="button" class="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700" @click="form.assigned_to = agent.id">Assign</button>
                            </div>
                        </div>
                    </div>
                    <InputText v-model="form.specific_hotel" label="Specific hotel" placeholder="Optional" :error="errors.specific_hotel" />
                    <div class="md:col-span-2">
                        <DestinationsSection v-model:destinations="destinations" v-model:combo="form.combo" :errors="errors" />
                    </div>
                    <div class="flex flex-wrap gap-6 md:col-span-2">
                        <NiceCheckbox v-model="form.urgent" label="Urgent" :error="errors.urgent" />
                        <NiceCheckbox v-model="form.from_flamur" label="Request from Flamur" :error="errors.from_flamur" />
                        <NiceCheckbox v-model="form.from_vesa" label="Request from Vesa" :error="errors.from_vesa" />
                    </div>
                    <div class="md:col-span-2">
                        <Textarea v-model="form.description" label="What does the customer want? *" :rows="5" :error="errors.description" />
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('simpleTasks.list')" class="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Creating…' : 'Create request' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
