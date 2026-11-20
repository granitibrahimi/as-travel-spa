<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { money } from '../../helpers/money.js';
import { castResource } from '../../types/responses.js';
import { requestStatusClass } from './statusClass.js';

// Quick look at a customer from a request: last 5 invoices, last requests of
// the persons connected to the customer, and those persons with their relation.
const props = defineProps({
    // { id, name } of the customer, or null when closed.
    customer: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const data = ref(null);
const loading = ref(false);

watch(() => props.customer?.id, async (id) => {
    data.value = null;
    if (! id) {
        return;
    }
    loading.value = true;
    try {
        const response = await api.get(`/simple-tasks/customers/${id}/overview`);
        data.value = castResource(response.data);
    } finally {
        loading.value = false;
    }
}, { immediate: true });

function onKeydown(event) {
    if (event.key === 'Escape') {
        emit('close');
    }
}

watch(() => props.customer, (open) => {
    document[open ? 'addEventListener' : 'removeEventListener']('keydown', onKeydown);
}, { immediate: true });

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
    <Teleport to="body">
        <div v-if="customer" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
            <div class="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
                <header class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                    <h2 class="text-base font-semibold">
                        <a :href="routeUrl('customers.show', customer.id)" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ customer.name }}</a>
                    </h2>
                    <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close" @click="emit('close')">
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4.3 4.3a1 1 0 0 1 1.4 0L10 8.6l4.3-4.3a1 1 0 1 1 1.4 1.4L11.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L8.6 10 4.3 5.7a1 1 0 0 1 0-1.4Z" /></svg>
                    </button>
                </header>

                <p v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>

                <div v-else-if="data" class="space-y-6 p-5">
                    <div v-if="data.debt" class="grid grid-cols-2 gap-3 sm:max-w-md">
                        <div class="rounded border px-3 py-2" :class="data.debt.open_balance > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'">
                            <p class="text-xs uppercase text-gray-500">Debt (open balance)</p>
                            <p class="text-lg font-bold tabular-nums" :class="data.debt.open_balance > 0 ? 'text-red-700' : 'text-gray-700'">{{ money(data.debt.open_balance) }}</p>
                        </div>
                        <div class="rounded border px-3 py-2" :class="data.debt.overdue_balance > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'">
                            <p class="text-xs uppercase text-gray-500">Overdue</p>
                            <p class="text-lg font-bold tabular-nums" :class="data.debt.overdue_balance > 0 ? 'text-amber-700' : 'text-gray-700'">{{ money(data.debt.overdue_balance) }}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <section>
                            <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Last invoices</h3>
                            <p v-if="! data.invoices.length" class="text-sm text-gray-400">No invoices yet.</p>
                            <table v-else class="w-full border-collapse border border-gray-300 text-sm">
                                <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                    <tr>
                                        <th class="border border-gray-300 px-2 py-1.5">Invoice</th>
                                        <th class="border border-gray-300 px-2 py-1.5">Destination</th>
                                        <th class="border border-gray-300 px-2 py-1.5 text-right">Amount</th>
                                        <th class="border border-gray-300 px-2 py-1.5 text-right">Persons</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="invoice in data.invoices" :key="invoice.id">
                                        <td class="border border-gray-300 px-2 py-1.5">
                                            <a :href="routeUrl('customerInvoices.show', invoice.id)" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ invoice.gen_id }}</a>
                                            <div class="text-xs text-gray-400">{{ invoice.on_date }}</div>
                                        </td>
                                        <td class="border border-gray-300 px-2 py-1.5">{{ invoice.parent_destination ?? '—' }}</td>
                                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ invoice.persons }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Last requests</h3>
                            <p v-if="! data.requests.length" class="text-sm text-gray-400">No other requests yet.</p>
                            <ul v-else class="divide-y divide-gray-100 rounded border border-gray-300 text-sm">
                                <li v-for="request in data.requests" :key="request.id" class="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1.5">
                                    <a :href="routeUrl('simpleTasks.show', request.id)" target="_blank" rel="noopener" class="font-medium text-red-600 hover:underline">#{{ request.id }}</a>
                                    <span class="text-xs text-gray-400">{{ request.created_at }}</span>
                                    <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="requestStatusClass(request.status)">{{ request.status?.name }}</span>
                                    <span class="text-xs text-gray-600">{{ request.type?.name }}</span>
                                    <span class="w-full text-xs text-gray-500">
                                        {{ request.person }}<template v-if="request.destinations"> · {{ request.destinations }}</template><template v-if="request.assigned_to"> · {{ request.assigned_to }}</template>
                                    </span>
                                </li>
                            </ul>
                        </section>
                    </div>

                    <section v-if="data.persons.length > 1">
                        <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Connected persons</h3>
                        <div class="flex flex-wrap gap-2">
                            <a
                                v-for="person in data.persons"
                                :key="`${person.id}-${person.relation}`"
                                :href="routeUrl('persons.show', person.id)"
                                target="_blank"
                                rel="noopener"
                                class="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm hover:border-red-300 hover:bg-red-50"
                            >
                                <span class="font-medium">{{ person.name }}</span>
                                <span class="ml-1 text-xs text-gray-500">{{ person.relation }}</span>
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </Teleport>
</template>
