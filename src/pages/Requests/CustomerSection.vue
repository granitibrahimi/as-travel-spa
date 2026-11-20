<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castResource } from '../../types/responses.js';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import { sourceSavesContact } from './customerContact.js';

// Who the request is from. Typing a contact or name looks the person up in
// Customers; picking a match links the request to that contact reference.
// Without a match the agent enters the person (saved with the contact) and
// can connect them to a customer.
const props = defineProps({
    // Reactive form holding the fields from emptyContactFields() plus source.
    form: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    sources: { type: Array, default: () => [] },
    relationTypes: { type: Array, default: () => [] },
    // The contact already linked (when editing).
    initialContact: { type: Object, default: null },
});

const linked = ref(props.initialContact);
const matches = ref([]);
const searching = ref(false);
let debounce = null;
let lastQuery = '';

const relationOptions = computed(() => props.relationTypes.map((t) => ({ value: t.id, label: t.name })));
const savesContact = computed(() => sourceSavesContact(props.sources, props.form.source));
const contactEntered = computed(() => (props.form.customer_contact ?? '').trim() !== '');

function query() {
    const contact = (props.form.customer_contact ?? '').trim();
    if (contact.length >= 3) {
        return contact;
    }

    return `${props.form.person.first_name ?? ''} ${props.form.person.last_name ?? ''}`.trim();
}

watch(
    () => [props.form.customer_contact, props.form.person.first_name, props.form.person.last_name],
    () => {
        if (linked.value) {
            return;
        }
        clearTimeout(debounce);
        debounce = setTimeout(search, 300);
    },
);

onBeforeUnmount(() => clearTimeout(debounce));

async function search() {
    const q = query();
    if (q.length < 3) {
        matches.value = [];
        lastQuery = '';

        return;
    }
    if (q === lastQuery) {
        return;
    }

    lastQuery = q;
    searching.value = true;
    try {
        const { data } = await api.get('/simple-tasks/contacts', { params: { q } });
        if (lastQuery === q) {
            matches.value = castResource(data) ?? [];
        }
    } finally {
        searching.value = false;
    }
}

function pick(match) {
    linked.value = match;
    matches.value = [];
    props.form.person_contact_reference_id = match.id;
    props.form.customer_contact = match.reference;
    props.form.customer_name = match.person?.name ?? props.form.customer_name;
}

function unlink() {
    const name = linked.value?.person?.name ?? '';
    const [first, ...rest] = name.split(/\s+/);

    linked.value = null;
    lastQuery = '';
    props.form.person_contact_reference_id = null;
    props.form.person.first_name = first ?? '';
    props.form.person.last_name = rest.join(' ');
}
</script>

<template>
    <div class="space-y-4">
        <div v-if="linked" class="flex flex-wrap items-start justify-between gap-3 rounded border border-green-200 bg-green-50 px-3 py-2">
            <div class="text-sm">
                <p class="font-medium text-gray-900">
                    <RouterLink v-if="linked.person" :to="routeUrl('persons.show', linked.person.id)" target="_blank" class="hover:underline">
                        {{ linked.person.name }}
                    </RouterLink>
                    <span class="ml-1 text-xs font-normal text-gray-500">{{ linked.type.name }} · {{ linked.reference }}</span>
                </p>
                <p class="mt-0.5 text-xs text-gray-600">
                    <template v-if="linked.customers.length">
                        Customer:
                        <template v-for="(customer, index) in linked.customers" :key="customer.id">
                            <span v-if="index">, </span>
                            <RouterLink :to="routeUrl('customers.show', customer.id)" target="_blank" class="text-red-600 hover:underline">{{ customer.name }}</RouterLink>
                            <span v-if="customer.relation" class="text-gray-400"> ({{ customer.relation }})</span>
                        </template>
                    </template>
                    <template v-else>Not connected to a customer yet.</template>
                </p>
            </div>
            <button type="button" class="text-xs text-gray-500 hover:text-red-600 hover:underline" @click="unlink">Change</button>
        </div>

        <template v-else>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputText
                    v-model="form.customer_contact"
                    label="Phone / email / username"
                    placeholder="Type to find the customer"
                    autocomplete="off"
                    :error="errors.customer_contact"
                />
                <div class="hidden md:block" />
                <InputText v-model="form.person.first_name" label="First name *" autocomplete="off" :error="errors['person.first_name'] || errors.customer_name" />
                <InputText v-model="form.person.last_name" label="Last name" autocomplete="off" :error="errors['person.last_name']" />
            </div>

            <div v-if="matches.length" class="rounded border border-gray-200">
                <p class="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium uppercase text-gray-500">Found in Customers</p>
                <button
                    v-for="match in matches"
                    :key="match.id"
                    type="button"
                    class="flex w-full flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-red-50"
                    @click="pick(match)"
                >
                    <span>
                        <span class="font-medium text-gray-900">{{ match.person?.name ?? '—' }}</span>
                        <span class="ml-1 text-xs text-gray-500">{{ match.type.name }} · {{ match.reference }}</span>
                        <span v-if="match.customers.length" class="ml-1 text-xs text-gray-500">· {{ match.customers.map((c) => c.name).join(', ') }}</span>
                    </span>
                    <span class="text-xs font-medium text-red-600">Use</span>
                </button>
            </div>
            <p v-else-if="searching" class="text-xs text-gray-400">Looking up…</p>

            <template v-if="contactEntered && savesContact">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.person.email" label="Email" placeholder="Optional" autocomplete="off" :error="errors['person.email']" />
                </div>
                <p class="text-xs text-gray-500">No match? The person is saved to Customers with this contact.</p>
            </template>
            <p v-else class="text-xs text-gray-500">Enter a contact and pick the source to save the person to Customers.</p>
        </template>

        <div v-if="linked || (contactEntered && savesContact)" class="space-y-3">
            <NiceCheckbox v-model="form.connect_customer" :label="linked?.customers?.length ? 'Connect to another customer' : 'Connect to a customer'" />
            <div v-if="form.connect_customer" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AsyncSelect
                    v-model="form.customer_id"
                    url="/simple-tasks/customers"
                    label="Customer *"
                    placeholder="Search customers…"
                    :min-chars="2"
                    :error="errors.customer_id"
                />
                <Select v-model="form.customer_relation_type" label="Relation" :options="relationOptions" :placeholder="null" :error="errors.customer_relation_type" />
            </div>
        </div>
    </div>
</template>
