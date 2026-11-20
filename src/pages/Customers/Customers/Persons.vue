<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { formatPhone } from '../../../helpers/phone.js';
import { useAuthStore } from '../../../stores/auth.js';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import Select from '../../../components/Form/Select.vue';
import Button from '../../../components/Button.vue';

// Travelers (persons) connected to this customer, with connect / disconnect.
const props = defineProps({
    customer: { type: Object, required: true },
});

const auth = useAuthStore();
const canConnect = computed(() => auth.can('persons.edit') || auth.can('customers.edit'));

const relations = ref(null);
const relationTypes = ref([]);
const form = ref({ person_id: null, type: 3 });
const error = ref('');
const saving = ref(false);
const pickerKey = ref(0);

async function load() {
    const { data } = await api.get(`/customers/customers/${props.customer.id}/persons`);
    relations.value = data.data ?? data;
}

async function connect() {
    if (saving.value || ! form.value.person_id) {
        return;
    }
    saving.value = true;
    error.value = '';
    try {
        await api.post(`/customers/persons/${form.value.person_id}/customers`, { customer_id: props.customer.id, type: form.value.type });
        form.value = { person_id: null, type: form.value.type };
        pickerKey.value++;
        await load();
    } catch (e) {
        if (e.response?.status !== 422) {
            throw e;
        }
        error.value = Object.values(e.response.data.errors ?? {})[0]?.[0] ?? 'Could not connect.';
    } finally {
        saving.value = false;
    }
}

async function disconnect(relation) {
    await api.put(`/customers/persons/${relation.person.id}/customers/${relation.id}/end`);
    await load();
}

onMounted(async () => {
    await load();
    if (canConnect.value) {
        const { data } = await api.get('/customers/persons/relation-types');
        relationTypes.value = (data.data ?? data).map((t) => ({ value: t.id, label: t.name }));
    }
});
</script>

<template>
    <FullWidthBox title="Persons" :collapsible="false">
        <p v-if="relations && ! relations.length" class="text-sm text-gray-500">No travelers connected to this customer yet.</p>

        <div v-else-if="relations" class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                    <tr class="text-left text-xs uppercase text-gray-500">
                        <th class="border border-gray-300 px-2 py-2">Traveler</th>
                        <th class="border border-gray-300 px-2 py-2">Relation</th>
                        <th class="border border-gray-300 px-2 py-2">Contacts</th>
                        <th class="border border-gray-300 px-2 py-2">From</th>
                        <th class="border border-gray-300 px-2 py-2">To</th>
                        <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                        <th v-if="canConnect" class="border border-gray-300 px-2 py-2" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="relation in relations" :key="relation.id" class="hover:bg-gray-50" :class="{ 'text-gray-400': ! relation.active }">
                        <td class="border border-gray-300 px-2 py-2">
                            <RouterLink v-if="relation.person" :to="routeUrl('persons.show', relation.person.id)" class="text-red-600 hover:underline">{{ relation.person.name }}</RouterLink>
                            <span v-else>Deleted</span>
                        </td>
                        <td class="border border-gray-300 px-2 py-2">{{ relation.type.name }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-xs">
                            <div v-for="reference in relation.person?.contact_references ?? []" :key="reference.id">
                                <span class="text-gray-500">{{ reference.type }}:</span> {{ formatPhone(reference.reference) }}
                            </div>
                        </td>
                        <td class="border border-gray-300 px-2 py-2">{{ relation.from_date ?? '—' }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ relation.to_date ?? '—' }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-center">
                            <span class="rounded px-2 py-0.5 text-xs font-medium" :class="relation.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                                {{ relation.active ? 'Yes' : 'No' }}
                            </span>
                        </td>
                        <td v-if="canConnect" class="border border-gray-300 px-2 py-2 text-right">
                            <button v-if="relation.active && relation.person" type="button" class="text-xs text-gray-500 hover:text-red-600 hover:underline" @click="disconnect(relation)">Disconnect</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <form v-if="canConnect" class="mt-4 grid grid-cols-1 items-end gap-3 border-t border-gray-200 pt-4 md:grid-cols-[1fr_12rem_auto_auto]" @submit.prevent="connect">
            <AsyncSelect
                :key="pickerKey"
                v-model="form.person_id"
                url="/customers/persons"
                label-key="full_name"
                label="Connect a traveler"
                placeholder="Search travelers by name…"
                :min-chars="2"
                :error="error"
            />
            <Select v-model="form.type" label="Relation" :options="relationTypes" :placeholder="null" />
            <Button type="submit" variant="primary" :disabled="saving || ! form.person_id">{{ saving ? 'Connecting…' : 'Connect' }}</Button>
            <RouterLink :to="routeUrl('persons.create')" class="rounded border border-gray-300 px-4 py-2 text-center text-sm hover:bg-gray-50">New traveler</RouterLink>
        </form>
    </FullWidthBox>
</template>
