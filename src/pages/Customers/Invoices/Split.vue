<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { money } from '../../../helpers/money';
import { castMutation, castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

/**
 * Split an invoice: tick the persons to move and pick the customer of the new
 * invoice (gen_id `<gen_id>/<n>`, same date/agent as this one). Persons on the
 * same ticket share a supplier bill, so ticking one ticks its ticket mates.
 */
const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();

const invoice = ref(null);
const selected = ref(new Set());
const form = reactive({ customer_id: null });
const errors = ref({});
const submitting = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customers/invoices/${route.params.id}`);
    invoice.value = castResource(data);
});

const persons = computed(() =>
    (invoice.value?.orders ?? []).flatMap((order) => order.persons.map((person) => ({ ...person, order }))),
);

const ticketKey = (person) => `${person.order.supplier?.id}#${person.tkt_number}`;

function isSelected(person) {
    return selected.value.has(person.id);
}

function toggle(person) {
    const next = new Set(selected.value);
    const on = !next.has(person.id);

    persons.value
        .filter((other) => ticketKey(other) === ticketKey(person) || (person.bill_id && other.bill_id === person.bill_id))
        .forEach((other) => (on ? next.add(other.id) : next.delete(other.id)));

    selected.value = next;
}

const selectedPersons = computed(() => persons.value.filter(isSelected));
const selectedTotal = computed(() => selectedPersons.value.reduce((sum, person) => sum + Number(person.sold_value), 0));
const allSelected = computed(() => persons.value.length > 0 && selectedPersons.value.length === persons.value.length);
const canSubmit = computed(() => form.customer_id && selectedPersons.value.length > 0 && !allSelected.value && !submitting.value);

function fieldError(name) {
    return errors.value[name]?.[0] ?? '';
}

async function submit() {
    if (!canSubmit.value) {
        return;
    }

    submitting.value = true;
    errors.value = {};

    try {
        const { data } = await api.post(`/customers/invoices/${invoice.value.id}/split`, {
            customer_id: form.customer_id,
            person_ids: selectedPersons.value.map((person) => person.id),
        });
        const { id, message } = castMutation(data);
        notifications.push({ type: 'success', message: message ?? 'Invoice split.' });
        router.push(routeUrl('customerInvoices.show', id));
    } catch (error) {
        submitting.value = false;

        if (error.response?.status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else {
            notifications.push({ type: 'error', message: 'Could not split the invoice.' });
            throw error;
        }
    }
}
</script>

<template>
    <AppLayout :title="invoice ? `Split invoice: ${invoice.gen_id}` : 'Split invoice'" fluid>
        <Loader v-if="! invoice" />

        <template v-else>
            <div class="mb-6 grid gap-4 md:grid-cols-2">
                <FullWidthBox title="Current customer" :collapsible="false">
                    <CustomerDetails :customer="invoice.customer" :boxed="false" />
                </FullWidthBox>

                <FullWidthBox :title="`Split invoice: ${invoice.gen_id}`" :collapsible="false">
                    <form class="space-y-4" @submit.prevent="submit">
                        <AsyncSelect
                            v-model="form.customer_id"
                            url="customers/customers/autosuggest"
                            label="Customer of the new invoice"
                            placeholder="Search customers…"
                            :error="fieldError('customer_id')"
                        />

                        <p class="text-sm text-gray-600">
                            Selected: <span class="font-semibold">{{ selectedPersons.length }}</span> of {{ persons.length }} persons,
                            <span class="font-semibold tabular-nums">{{ money(selectedTotal) }}</span>.
                            The new invoice keeps this invoice's date, due date and agent.
                        </p>
                        <p v-if="allSelected" class="text-sm text-amber-600">At least one person must stay on this invoice.</p>
                        <p v-if="fieldError('person_ids')" class="text-sm text-red-600">{{ fieldError('person_ids') }}</p>

                        <div class="flex items-center gap-2">
                            <button
                                type="submit"
                                class="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                                :disabled="!canSubmit"
                            >
                                {{ submitting ? 'Splitting…' : 'Split invoice' }}
                            </button>
                            <RouterLink :to="routeUrl('customerInvoices.show', invoice.id)" class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                Cancel
                            </RouterLink>
                        </div>
                    </form>
                </FullWidthBox>
            </div>

            <FullWidthBox :title="`Items: (${invoice.orders.length})`" :collapsible="false">
                <div class="space-y-4">
                    <div v-for="order in invoice.orders" :key="order.id" class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <table class="w-full self-start border-collapse bg-white text-sm lg:col-span-4">
                                <tbody>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Vendor:</span> <span class="font-semibold">{{ order.supplier?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Product:</span> <span class="font-semibold">{{ order.product?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Destination:</span> <span class="font-semibold">{{ order.destination?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Date:</span> <span class="font-semibold">{{ order.from_date }}<template v-if="order.to_date"> - {{ order.to_date }}</template></span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Extra comments:</span> <span class="font-semibold">{{ order.extra_info ?? '—' }}</span></td>
                                </tr>
                                </tbody>
                            </table>

                            <div class="overflow-x-auto lg:col-span-8">
                                <table class="w-full border-collapse border border-gray-300 bg-white text-sm">
                                    <thead>
                                    <tr class="text-left text-gray-600">
                                        <th class="w-10 border border-gray-300 bg-gray-50 px-3 py-2 font-medium"></th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">ID</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Name and surname</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">TKT Number</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Sold value</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Buying value</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr v-if="order.persons.length === 0">
                                        <td colspan="6" class="border border-gray-300 px-3 py-4 text-center text-gray-400">No persons.</td>
                                    </tr>
                                    <tr
                                        v-for="person in order.persons"
                                        :key="person.id"
                                        class="cursor-pointer hover:bg-gray-50"
                                        :class="{ 'bg-red-50 hover:bg-red-50': isSelected(person) }"
                                        @click="toggle({ ...person, order })"
                                    >
                                        <td class="border border-gray-300 px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                class="h-4 w-4 rounded border-gray-300 text-red-700"
                                                :checked="isSelected(person)"
                                                :aria-label="`Split off ${person.name_surname}`"
                                                @click.stop="toggle({ ...person, order })"
                                            />
                                        </td>
                                        <td class="border border-gray-300 px-3 py-2">{{ person.id }}</td>
                                        <td class="border border-gray-300 px-3 py-2">{{ person.name_surname }}</td>
                                        <td class="border border-gray-300 px-3 py-2">{{ person.tkt_number ?? '—' }}</td>
                                        <td class="border border-gray-300 px-3 py-2 tabular-nums">{{ money(person.sold_value) }}</td>
                                        <td class="border border-gray-300 px-3 py-2 tabular-nums">{{ money(person.buying_value) }}</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
