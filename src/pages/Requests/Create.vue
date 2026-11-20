<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
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

const router = useRouter();
const auth = useAuthStore();

const form = reactive({ customer_name: '', customer_contact: '', source: null, type: null, description: '', assigned_to: null, urgent: false, from_flamur: false, from_vesa: false, combo: false, specific_hotel: '' });
const destinations = ref([]);
const options = ref({ statuses: [], sources: [], types: [], agents: [] });
const errors = ref({});
const processing = ref(false);

const sourceOptions = computed(() => options.value.sources.map((s) => ({ value: s.id, label: s.name })));
const typeOptions = computed(() => (options.value.types ?? []).map((t) => ({ value: t.id, label: t.name })));
const agentOptions = computed(() => options.value.agents.map((a) => ({ value: a.id, label: a.name })));

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
        const { data } = await api.post('/simple-tasks', { ...form, parent_destination_ids: destinations.value.map((d) => d.id) });
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
            <FullWidthBox title="Request details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.customer_name" label="Customer name *" :error="errors.customer_name" />
                    <InputText v-model="form.customer_contact" label="Phone / email / username" :error="errors.customer_contact" />
                    <Select v-model="form.source" label="Source *" :options="sourceOptions" :error="errors.source" />
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
