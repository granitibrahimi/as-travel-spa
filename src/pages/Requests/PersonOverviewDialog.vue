<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { formatPhone } from '../../helpers/phone.js';
import { castResource } from '../../types/responses.js';
import { requestStatusClass } from './statusClass.js';
import SpamBadge from './SpamBadge.vue';

// Quick look at a traveler from a request, like CustomerOverviewDialog:
// request counts, their last requests and the customers they belong to.
const props = defineProps({
    // { id, name } of the person, or null when closed.
    person: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const data = ref(null);
const loading = ref(false);

watch(() => props.person?.id, async (id) => {
    data.value = null;
    if (! id) {
        return;
    }
    loading.value = true;
    try {
        const response = await api.get(`/simple-tasks/persons/${id}/overview`);
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

watch(() => props.person, (open) => {
    document[open ? 'addEventListener' : 'removeEventListener']('keydown', onKeydown);
}, { immediate: true });

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

const tiles = (stats) => [
    { label: 'Requests', value: stats.total, tone: 'gray' },
    { label: 'Waiting', value: stats.waiting, tone: stats.waiting ? 'amber' : 'gray' },
    { label: 'Closed', value: stats.closed, tone: stats.closed ? 'green' : 'gray' },
    { label: 'Offers sent', value: stats.offers, tone: 'gray' },
    { label: 'Spam', value: stats.spam, tone: stats.spam ? 'orange' : 'gray' },
];

const toneClass = {
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
};
</script>

<template>
    <Teleport to="body">
        <div v-if="person" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
            <div class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
                <header class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                    <h2 class="text-base font-semibold">
                        <a :href="routeUrl('persons.show', person.id)" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ person.name }}</a>
                        <span v-if="data?.stats.last_request_at" class="ml-2 text-xs font-normal text-gray-500">last request {{ data.stats.last_request_at }}</span>
                    </h2>
                    <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close" @click="emit('close')">
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4.3 4.3a1 1 0 0 1 1.4 0L10 8.6l4.3-4.3a1 1 0 1 1 1.4 1.4L11.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L8.6 10 4.3 5.7a1 1 0 0 1 0-1.4Z" /></svg>
                    </button>
                </header>

                <p v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>

                <div v-else-if="data" class="space-y-6 p-5">
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div v-for="tile in tiles(data.stats)" :key="tile.label" class="rounded border px-3 py-2" :class="toneClass[tile.tone]">
                            <p class="text-xs uppercase text-gray-500">{{ tile.label }}</p>
                            <p class="text-lg font-bold tabular-nums">{{ tile.value }}</p>
                        </div>
                    </div>

                    <section>
                        <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Requests</h3>
                        <p v-if="! data.requests.length" class="text-sm text-gray-400">No requests yet.</p>
                        <table v-else class="w-full border-collapse border border-gray-300 text-sm">
                            <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr>
                                    <th class="border border-gray-300 px-2 py-1.5">Request</th>
                                    <th class="border border-gray-300 px-2 py-1.5">Type</th>
                                    <th class="border border-gray-300 px-2 py-1.5">Destinations</th>
                                    <th class="border border-gray-300 px-2 py-1.5">Status</th>
                                    <th class="border border-gray-300 px-2 py-1.5">Agent</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="request in data.requests" :key="request.id">
                                    <td class="border border-gray-300 px-2 py-1.5">
                                        <a :href="routeUrl('simpleTasks.show', request.id)" target="_blank" rel="noopener" class="font-medium text-red-600 hover:underline">#{{ request.id }}</a>
                                        <div class="text-xs text-gray-400">{{ request.created_at }}<template v-if="request.contact"> · {{ formatPhone(request.contact) }}</template></div>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5">{{ request.type?.name }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5">
                                        {{ request.destinations || '—' }}<span v-if="request.specific_hotel" class="text-gray-500"> · {{ request.specific_hotel }}</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5">
                                        <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="requestStatusClass(request.status)">{{ request.status?.name }}</span>
                                        <SpamBadge v-if="request.spam" class="ml-1" />
                                        <span v-if="request.offers_count" class="mt-0.5 block text-[11px] text-green-700">{{ request.offers_count }} {{ request.offers_count === 1 ? 'offer' : 'offers' }}</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5">{{ request.assigned_to ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="data.customers.length">
                        <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Customers</h3>
                        <div class="flex flex-wrap gap-2">
                            <a
                                v-for="customer in data.customers"
                                :key="`${customer.id}-${customer.relation}`"
                                :href="routeUrl('customers.show', customer.id)"
                                target="_blank"
                                rel="noopener"
                                class="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm hover:border-red-300 hover:bg-red-50"
                            >
                                <span class="font-medium">{{ customer.name }}</span>
                                <span class="ml-1 text-xs text-gray-500">as {{ customer.relation }}</span>
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </Teleport>
</template>
