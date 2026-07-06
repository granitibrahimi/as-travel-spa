<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../helpers/money';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const auth = useAuthStore();
const id = route.params.id;

const loading = ref(true);
const offer = ref(null);
const destinations = ref([]);
const common = ref({ lines: [], total: 0 });
const options = ref([]);

// 'person' | 'total'
const priceMode = ref('person');
// Detailed mode swaps the option cards for full tables (every line, supplier, price).
const detailed = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/static-offers/${id}`);
    const payload = data.data ?? data;
    offer.value = payload.offer;
    destinations.value = payload.destinations ?? [];
    common.value = payload.common ?? { lines: [], total: 0 };
    options.value = payload.options ?? [];
    loading.value = false;
});

const displayPrice = (total) => priceMode.value === 'person'
    ? money(Math.round(total / (offer.value?.pax || 1)))
    : money(total);

const optionsFor = (destinationId) => options.value.filter(
    (option) => option.parent_destination_id === destinationId,
);

// Destinations that actually have options require a pick.
const selectableDestinations = computed(() => destinations.value.filter(
    (destination) => optionsFor(destination.id).length > 0,
));

// destination id → selected option id
const selection = ref({});

function select(destinationId, optionId) {
    selection.value = { ...selection.value, [destinationId]: optionId };
}

const isSelected = (destinationId, optionId) => selection.value[destinationId] === optionId;

const selectedOptionFor = (destinationId) => options.value.find(
    (option) => option.id === selection.value[destinationId],
);

const complete = computed(() => selectableDestinations.value.every(
    (destination) => selection.value[destination.id],
));

const combinedTotal = computed(() => {
    const optionsTotal = selectableDestinations.value.reduce((sum, destination) => {
        return sum + (selectedOptionFor(destination.id)?.total ?? 0);
    }, 0);

    return common.value.total + optionsTotal;
});
</script>

<template>
    <AppLayout :title="offer ? `Offer ${offer.code ?? ''}: ${offer.name}` : 'Offer'" fluid>
        <Loader v-if="loading" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Left column: summary, common services, total (1/3) -->
            <div class="space-y-6 lg:sticky lg:top-20 lg:self-start">
                <div v-if="offer.personal && offer.expired"
                     class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    This offer is not valid anymore.
                </div>

                <FullWidthBox title="Offer summary" :collapsible="false">
                    <table class="w-full border-collapse rounded border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Code</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                    {{ offer.code ?? '—' }}
                                    <span v-if="offer.personal" class="ml-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Personal</span>
                                </td>
                            </tr>
                            <tr v-if="offer.lead">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Lead</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ offer.lead }}</td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Travellers</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ offer.pax }}</td>
                            </tr>
                            <tr v-for="destination in destinations" :key="destination.id">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">{{ destination.name }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ destination.nights ?? '—' }} nights</td>
                            </tr>
                            <tr v-if="(offer.valid_from || offer.valid_to) && !offer.personal">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Valid</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ offer.valid_from ?? '…' }} – {{ offer.valid_to ?? '…' }}</td>
                            </tr>
                            <tr v-if="offer.personal && offer.valid_to">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Deadline</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                    {{ offer.valid_to }}
                                    <span v-if="offer.expired" class="ml-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>
                                </td>
                            </tr>
                            <tr v-if="offer.travel_from || offer.travel_to">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Travel</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ offer.travel_from ?? '…' }} – {{ offer.travel_to ?? '…' }}</td>
                            </tr>
                            <tr v-if="offer.travel_date || offer.return_date">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Travel dates</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ offer.travel_date ?? '…' }} – {{ offer.return_date ?? '…' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>

                <FullWidthBox title="Common services" :collapsible="false">
                    <p v-if="common.lines.length === 0" class="text-sm text-gray-400">No common services.</p>
                    <table v-else class="w-full border-collapse rounded border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Service</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(line, i) in common.lines" :key="i">
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ line.label }}
                                    <span class="block text-xs text-gray-400">
                                        {{ line.category }} · {{ line.basis }}<template v-if="line.supplier"> · {{ line.supplier }}</template>
                                    </span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">
                                    {{ money(line.contribution) }}
                                    <span v-if="line.contribution !== line.price" class="block text-xs text-gray-400">{{ money(line.price) }} × {{ offer.pax }}</span>
                                </td>
                            </tr>
                            <tr class="bg-gray-50 font-semibold">
                                <td class="border border-gray-300 px-2 py-2">Common total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{{ money(common.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>

                <div class="flex justify-end gap-2">
                    <RouterLink v-if="auth.can('staticOffers.create')" :to="`/offers/${offer.id}/edit`" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                        Edit
                    </RouterLink>
                    <RouterLink to="/offers" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Back to offers</RouterLink>
                </div>
            </div>

            <!-- Right column: options per destination (2/3) -->
            <div class="space-y-6 lg:col-span-2">
                <!-- Total + price mode toggle -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="text-sm">
                        <template v-if="complete">
                            <span class="text-gray-500">Total:</span>
                            <span class="ml-2 text-2xl font-bold text-red-600">{{ displayPrice(combinedTotal) }}</span>
                            <span class="ml-1 text-gray-400">{{ priceMode === 'person' ? 'per person' : 'in total' }}</span>
                        </template>
                        <span v-else class="text-amber-600">Select an option for every destination to see the total.</span>
                    </div>

                    <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                        <button
                            type="button"
                            class="rounded px-4 py-1.5 text-sm font-medium"
                            :class="priceMode === 'person' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                            @click="priceMode = 'person'"
                        >
                            Per person
                        </button>
                        <button
                            type="button"
                            class="rounded px-4 py-1.5 text-sm font-medium"
                            :class="priceMode === 'total' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                            @click="priceMode = 'total'"
                        >
                            Total
                        </button>
                        <span class="mx-1 h-5 w-px bg-gray-200" />
                        <button
                            type="button"
                            class="rounded px-4 py-1.5 text-sm font-medium"
                            :class="detailed ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                            @click="detailed = !detailed"
                        >
                            Details
                        </button>
                    </div>
                </div>

                <section v-for="destination in destinations" :key="destination.id">
                    <template v-if="optionsFor(destination.id).length">
                        <h2 class="mb-3 text-lg font-semibold">
                            {{ destination.name }}
                            <span v-if="destination.nights" class="text-sm font-normal text-gray-500">· {{ destination.nights }} nights</span>
                        </h2>

                        <!-- Detailed mode: one full table per option -->
                        <div v-if="detailed" class="space-y-4">
                            <div
                                v-for="option in optionsFor(destination.id)"
                                :key="option.id"
                                class="rounded-lg border-2 bg-white p-5 shadow-lg"
                                :class="isSelected(destination.id, option.id) ? 'border-red-600 ring-1 ring-red-600' : 'border-gray-200'"
                            >
                                <div class="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 class="font-semibold">{{ option.name }}</h3>
                                        <p v-if="option.description" class="mt-0.5 text-sm text-gray-500">{{ option.description }}</p>
                                        <div v-if="option.taxes_included || option.transfer_included" class="mt-1.5 flex flex-wrap gap-1.5">
                                            <span v-if="option.taxes_included" class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Taxes included</span>
                                            <span v-if="option.transfer_included" class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Transfer included</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        class="rounded px-3 py-1 text-xs font-medium"
                                        :class="isSelected(destination.id, option.id)
                                            ? 'bg-red-600 text-white'
                                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'"
                                        @click="select(destination.id, option.id)"
                                    >
                                        {{ isSelected(destination.id, option.id) ? 'Selected' : 'Select' }}
                                    </button>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full border-collapse rounded border border-gray-300 text-sm">
                                        <thead>
                                            <tr class="text-left text-xs uppercase text-gray-500">
                                                <th class="border border-gray-300 px-2 py-2">Service</th>
                                                <th class="border border-gray-300 px-2 py-2">Supplier</th>
                                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Basis</th>
                                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Price</th>
                                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="(line, i) in option.lines" :key="i">
                                                <td class="border border-gray-300 px-2 py-2">
                                                    {{ line.label }}
                                                    <span class="block text-xs text-gray-400">{{ line.category }}</span>
                                                </td>
                                                <td class="border border-gray-300 px-2 py-2">{{ line.supplier || '—' }}</td>
                                                <td class="border border-gray-300 px-2 py-2 text-center">{{ line.basis }}</td>
                                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{{ money(line.price) }}</td>
                                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{{ money(line.contribution) }}</td>
                                            </tr>
                                            <tr class="bg-gray-50 font-semibold">
                                                <td colspan="4" class="border border-gray-300 px-2 py-2">Option total</td>
                                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap">{{ money(option.total) }}</td>
                                            </tr>
                                            <tr class="bg-gray-50">
                                                <td colspan="4" class="border border-gray-300 px-2 py-2 text-gray-500">With common services ({{ money(common.total) }})</td>
                                                <td class="border border-gray-300 px-2 py-2 text-right whitespace-nowrap font-bold text-red-600">
                                                    {{ displayPrice(option.total + common.total) }}
                                                    <span class="block text-xs font-normal text-gray-400">{{ priceMode === 'person' ? 'per person' : 'in total' }}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <button
                                v-for="option in optionsFor(destination.id)"
                                :key="option.id"
                                type="button"
                                class="rounded-lg border-2 bg-white p-5 text-left shadow-lg transition-colors"
                                :class="isSelected(destination.id, option.id)
                                    ? 'border-red-600 ring-1 ring-red-600'
                                    : 'border-gray-200 hover:border-gray-300'"
                                @click="select(destination.id, option.id)"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <h3 class="font-semibold">{{ option.name }}</h3>
                                    <span
                                        v-if="isSelected(destination.id, option.id)"
                                        class="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white"
                                    >
                                        Selected
                                    </span>
                                </div>
                                <p v-if="option.description" class="mt-1 text-sm text-gray-500">{{ option.description }}</p>
                                <div v-if="option.taxes_included || option.transfer_included" class="mt-2 flex flex-wrap gap-1.5">
                                    <span v-if="option.taxes_included" class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Taxes included</span>
                                    <span v-if="option.transfer_included" class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Transfer included</span>
                                </div>

                                <ul class="mt-3 space-y-1 text-sm text-gray-600">
                                    <li v-for="(line, i) in option.lines" :key="i" class="flex justify-between gap-2">
                                        <span class="truncate">{{ line.label }}</span>
                                        <span class="whitespace-nowrap text-gray-400">{{ money(line.price) }}</span>
                                    </li>
                                </ul>

                                <p class="mt-4 text-right text-xl font-bold text-red-600">
                                    {{ displayPrice(option.total) }}
                                    <span class="block text-xs font-normal text-gray-400">
                                        option {{ priceMode === 'person' ? 'per person' : 'total' }}
                                    </span>
                                </p>
                            </button>
                        </div>
                    </template>
                </section>
            </div>
        </div>
    </AppLayout>
</template>
