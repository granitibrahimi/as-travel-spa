<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../helpers/api';
import { useFormOptionsStore, toOptions } from '../../stores/formOptions.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import InputText from '../../components/Form/InputText.vue';
import DateInput from '../../components/Form/DateInput.vue';
import InputNumber from '../../components/Form/InputNumber.vue';
import Select from '../../components/Form/Select.vue';
import Textarea from '../../components/Form/Textarea.vue';
import Loader from '../../components/Loader.vue';

const router = useRouter();

// The contact lookup lives under /api/base (sibling of /api/v1, the api client's
// base) so it's addressed with an absolute URL off the same origin.
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const contactsUrl = `${apiOrigin}/api/base/contact-references`;

// Agent lookup is relative to the api client's /api/v1 base.
const agentsUrl = 'users/autosuggest';

const selectClass = 'w-full rounded border border-gray-300 px-3 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500';

const formOptions = useFormOptionsStore();
const sources = computed(() => toOptions(formOptions.taskSources));
const types = computed(() => toOptions(formOptions.taskTypes));
const destinations = computed(() => toOptions(formOptions.destinations));
const errors = ref({});
const processing = ref(false);
const ready = ref(false);

const form = reactive({
    contactMode: 'existing', // 'existing' | 'new' (UI only)
    contact_reference_id: null,
    source: null,
    first_name: '',
    last_name: '',
    reference: '',
    type: 0,
    destination_id: null,
    adults: 2,
    children: 0,
    children_age: [],
    days: null,
    budget: null,
    travel_date: '',
    assigned_to: null,
    extra_notes: '',
});

onMounted(() => {
    form.type = types.value[0]?.value ?? 0;
    ready.value = true;
});

// Keep one age input per child.
watch(() => Number(form.children), (count) => {
    const target = Math.max(0, count || 0);
    const ages = [...form.children_age];

    if (target > ages.length) {
        while (ages.length < target) {
            ages.push(null);
        }
    } else {
        ages.length = target;
    }

    form.children_age = ages;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form };
    delete payload.contactMode;

    if (form.contactMode === 'existing') {
        payload.source = null;
        payload.first_name = null;
        payload.last_name = null;
        payload.reference = null;
    } else {
        payload.contact_reference_id = null;
    }

    try {
        const { data } = await api.post('/tasks', payload);
        router.push(`/tasks/${data.id}`);
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
    <AppLayout title="New task">
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <!-- Contact -->
            <FullWidthBox title="Contact">
                <div class="mb-4 flex gap-6 text-sm">
                    <label class="inline-flex items-center gap-2">
                        <input v-model="form.contactMode" type="radio" value="existing"> Existing contact
                    </label>
                    <label class="inline-flex items-center gap-2">
                        <input v-model="form.contactMode" type="radio" value="new"> New contact
                    </label>
                </div>

                <div v-if="form.contactMode === 'existing'">
                    <AsyncSelect
                        v-model="form.contact_reference_id"
                        :url="contactsUrl"
                        label="Find contact / connected customer *"
                        placeholder="Search by name, phone, handle…"
                        :error="errors.contact_reference_id"
                    />
                </div>

                <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.source" :options="sources" label="Source *" :error="errors.source" />
                    <InputText v-model="form.reference" label="Contact reference * (phone / handle / email)" :error="errors.reference" />
                    <InputText v-model="form.first_name" label="First name *" :error="errors.first_name" />
                    <InputText v-model="form.last_name" label="Last name" :error="errors.last_name" />
                </div>
            </FullWidthBox>

            <!-- Inquiry -->
            <FullWidthBox title="Inquiry">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select v-model="form.type" :options="types" label="Type *" :placeholder="null" :error="errors.type" />
                    <Select v-model="form.destination_id" :options="destinations" label="Destination" :error="errors.destination_id" />
                    <InputNumber v-model="form.days" label="Days" min="1" />
                </div>

                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputNumber v-model="form.adults" label="Adults *" min="1" :error="errors.adults" />
                    <InputNumber v-model="form.children" label="Children *" min="0" :error="errors.children" />
                    <InputNumber v-model="form.budget" label="Budget (€)" min="0" step="0.01" />
                </div>

                <div v-if="form.children_age.length" class="mt-4">
                    <label class="mb-1 block text-sm font-medium text-gray-700">Child ages *</label>
                    <div class="flex flex-wrap gap-3">
                        <div v-for="(age, i) in form.children_age" :key="i" class="w-28">
                            <InputNumber
                                v-model="form.children_age[i]"
                                min="0"
                                :placeholder="`Child ${i + 1}`"
                                :error="errors[`children_age.${i}`]"
                            />
                        </div>
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DateInput v-model="form.travel_date" label="Travel date" />
                    <AsyncSelect
                        v-model="form.assigned_to"
                        :url="agentsUrl"
                        label="Assign Agent"
                        placeholder="Search agent…"
                        :error="errors.assigned_to"
                    />
                </div>

                <div class="mt-4">
                    <Textarea v-model="form.extra_notes" label="Notes" />
                </div>
            </FullWidthBox>

            <div class="flex justify-end gap-3">
                <RouterLink to="/tasks" class="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <button
                    type="submit"
                    :disabled="processing"
                    class="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                    {{ processing ? 'Saving…' : 'Create task' }}
                </button>
            </div>
        </form>
    </AppLayout>
</template>
