<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

// Dropdown data comes from the shared form-options store (synced reference
// data), normalized to the { value, label } shape the Select expects.
const genders = computed(() => toOptions(formOptions.personGenders));
const classifications = computed(() => toOptions(formOptions.personClassifications));
const contactReferenceTypes = computed(() => toOptions(formOptions.personContractReferenceTypes));

const selectClass = 'w-full rounded border border-gray-300 px-3 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500';

const form = reactive({
    gender: null,
    first_name: '',
    last_name: '',
    country_id: null,
    dob: '',
    passport_number: '',
    passport_expiry_date: '',
    email: '',
    classification: null,
    no_ai: false,
    contact_references: [],
});

const countryInitial = ref(null);

const errors = ref({});
const processing = ref(false);
const ready = ref(false);

const addContactReference = () => form.contact_references.push({
    id: null,
    type: contactReferenceTypes.value[0]?.value ?? null,
    reference: '',
});
const removeContactReference = (index) => form.contact_references.splice(index, 1);

onMounted(async () => {
    const person = isEdit
        ? await api.get(`/persons/${id}`).then((r) => r.data.data ?? r.data)
        : null;

    if (person) {
        Object.assign(form, {
            gender: person.gender ?? null,
            first_name: person.first_name ?? '',
            last_name: person.last_name ?? '',
            country_id: person.country_id ?? null,
            dob: person.dob ?? '',
            passport_number: person.passport_number ?? '',
            passport_expiry_date: person.passport_expiry_date ?? '',
            email: person.email ?? '',
            classification: person.classification ?? null,
            no_ai: Boolean(person.no_ai),
            contact_references: (person.contact_references ?? []).map((reference) => ({ ...reference })),
        });
        countryInitial.value = person.country ?? null;
    }

    ready.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {
        ...form,
        dob: form.dob || null,
        passport_expiry_date: form.passport_expiry_date || null,
        classification: form.classification ?? null,
    };

    try {
        const { data } = await (isEdit
            ? api.put(`/persons/${id}`, payload)
            : api.post('/persons', payload));

        router.push(`/travelers/${isEdit ? id : data.id}`);
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
    <AppLayout :title="isEdit ? 'Edit Traveler' : 'New Traveler'">
        <Loader v-if="! ready" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Traveler details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.first_name" label="First name *" :error="errors.first_name" />
                    <InputText v-model="form.last_name" label="Last name *" :error="errors.last_name" />

                    <Select v-model="form.gender" :options="genders" label="Gender *" :error="errors.gender" />

                    <AsyncSelect
                        v-model="form.country_id"
                        url="/persons/countries"
                        :initial-option="countryInitial"
                        label="Nationality *"
                        placeholder="Search country or nationality…"
                        :error="errors.country_id"
                    />

                    <DateInput v-model="form.dob" label="Date of birth" :error="errors.dob" />

                    <Select v-model="form.classification" :options="classifications" label="Classification" placeholder="—" :error="errors.classification" />

                    <InputText v-model="form.passport_number" label="Passport number" :error="errors.passport_number" />

                    <DateInput v-model="form.passport_expiry_date" label="Passport expiry date" :error="errors.passport_expiry_date" />

                    <InputText v-model="form.email" label="Email" type="email" :error="errors.email" />

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">No AI</label>
                        <button
                            type="button"
                            role="switch"
                            :aria-checked="form.no_ai"
                            class="relative h-6 w-11 rounded-full transition-colors"
                            :class="form.no_ai ? 'bg-red-600' : 'bg-gray-300'"
                            @click="form.no_ai = ! form.no_ai"
                        >
                            <span
                                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                                :class="form.no_ai ? 'translate-x-5' : ''"
                            />
                        </button>
                        <p class="mt-1 text-xs text-gray-400">When enabled the AI must not contact this traveler.</p>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Contact references" :collapsible="false">
                <p v-if="form.contact_references.length === 0" class="text-sm text-gray-400">
                    No contact references yet — add how this traveler can be reached (Instagram, WhatsApp, phone…).
                </p>

                <div class="space-y-3">
                    <div v-for="(reference, i) in form.contact_references" :key="i" class="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div class="md:col-span-3">
                            <Select v-model="reference.type" :options="contactReferenceTypes" :placeholder="null" :error="errors[`contact_references.${i}.type`]" />
                        </div>
                        <div class="md:col-span-8">
                            <InputText v-model="reference.reference" placeholder="Handle / number / address…" :error="errors[`contact_references.${i}.reference`]" />
                        </div>
                        <div class="flex items-start md:col-span-1">
                            <Button variant="danger" @click="removeContactReference(i)">✕</Button>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button size="sm" @click="addContactReference">+ Contact reference</Button>
                </template>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/travelers" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update traveler' : 'Create traveler') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
