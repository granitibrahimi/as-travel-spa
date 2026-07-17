<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import flightsApi from '../../helpers/flightsApi.js';
import { todayApiDate } from '../../helpers/date.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Alert from '../../components/Alert.vue';
import Button from '../../components/Button.vue';
import DateInput from '../../components/Form/DateInput.vue';
import Loader from '../../components/Loader.vue';

const ROUND_TRIP = 1;
const ONE_WAY = 2;

const form = reactive({
    flightType: ROUND_TRIP,
    fromDestinationId: null,
    toDestinationId: null,
    departDate: todayApiDate(),
    returnDate: '',
    adults: 1,
    children: 0,
    infants: 0,
    flexDays: 0,
});

// Reference data from GET /form-options.
const destinations = ref([]);
const connections = ref({});          // { fromId: [toId, …] }
const flightTypes = ref([]);          // [{ value, name }]
const flexibilities = ref([]);        // [{ value, name }]
const optionsError = ref('');

// Search state.
const errors = ref({});               // field → message (422)
const providerErrors = ref({});       // provider → message (partial failures)
const results = ref(null);            // { outbound, return } once searched
const searchedProviders = ref([]);    // provider names serving the searched route
const searching = ref(false);
const searchError = ref('');
let controller = null;

// One selected flight per leg, keyed by index into its group.
const selected = reactive({ outbound: null, return: null });

onMounted(async () => {
    try {
        const { data } = await flightsApi.get('/form-options');
        destinations.value = data.destinations ?? [];
        connections.value = data.connections ?? {};
        flightTypes.value = data.flightTypes ?? [];
        flexibilities.value = data.flexibilities ?? [];
    } catch (e) {
        optionsError.value = e.response?.data?.message ?? 'Could not load the search form.';
    }
});

// Destinations reachable from the chosen origin (falls back to all when the
// origin has no mapped connections or none is picked yet).
const destinationOptions = computed(() => {
    const originId = form.fromDestinationId;

    if (!originId || !connections.value[originId]) {
        return destinations.value;
    }

    const reachable = new Set(connections.value[originId].map(Number));

    return destinations.value.filter((d) => reachable.has(Number(d.id)));
});

// Clear an origin→destination pair that is no longer valid after changing origin.
watch(() => form.fromDestinationId, () => {
    if (form.toDestinationId && !destinationOptions.value.some((d) => d.id === form.toDestinationId)) {
        form.toDestinationId = null;
    }
});

// One-way trips have no return leg.
watch(() => form.flightType, (type) => {
    if (type === ONE_WAY) {
        form.returnDate = '';
    }
});

function swap() {
    [form.fromDestinationId, form.toDestinationId] = [form.toDestinationId, form.fromDestinationId];
}

// --- Passengers stepper popover ------------------------------------------
const paxOpen = ref(false);
const paxRef = ref(null);

const paxSteps = [
    { key: 'adults', label: 'Adults', hint: '12+ years', min: 1, max: 9 },
    { key: 'children', label: 'Children', hint: '2–11 years', min: 0, max: 9 },
    { key: 'infants', label: 'Infants', hint: 'Under 2 years', min: 0, max: 9 },
];

const paxSummary = computed(() => {
    const total = form.adults + form.children + form.infants;

    return `${total} ${total === 1 ? 'passenger' : 'passengers'}`;
});

function step(key, delta) {
    const meta = paxSteps.find((s) => s.key === key);
    const next = form[key] + delta;

    if (next < meta.min || next > meta.max) {
        return;
    }

    // Infants can't outnumber adults (one lap each).
    if (key === 'infants' && next > form.adults) {
        return;
    }

    form[key] = next;

    // Reducing adults below the infant count pulls infants down with it.
    if (key === 'adults' && form.infants > next) {
        form.infants = next;
    }
}

function onDocumentClick(event) {
    if (paxOpen.value && paxRef.value && !paxRef.value.contains(event.target)) {
        paxOpen.value = false;
    }
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick));

// --- Submit ---------------------------------------------------------------
async function submit() {
    if (searching.value) {
        return;
    }

    // Client-side required dates: departure always, return on round trips.
    const dateErrors = {};

    if (!form.departDate) {
        dateErrors.departDate = 'Departure date is required.';
    }

    if (form.flightType === ROUND_TRIP && !form.returnDate) {
        dateErrors.returnDate = 'Return date is required.';
    }

    if (Object.keys(dateErrors).length) {
        errors.value = dateErrors;
        return;
    }

    controller?.abort();
    controller = new AbortController();

    searching.value = true;
    errors.value = {};
    providerErrors.value = {};
    searchError.value = '';
    searchedProviders.value = [];
    selected.outbound = null;
    selected.return = null;

    const params = {
        flightType: form.flightType,
        fromDestinationId: form.fromDestinationId,
        toDestinationId: form.toDestinationId,
        departDate: form.departDate,
        adults: form.adults,
        children: form.children,
        infants: form.infants,
    };

    if (form.flightType === ROUND_TRIP && form.returnDate) {
        params.returnDate = form.returnDate;
    }

    if (form.flexDays) {
        params.flexDays = form.flexDays;
    }

    try {
        const { data } = await flightsApi.get('/search', { params, signal: controller.signal });
        results.value = { outbound: data.outbound ?? [], return: data.return ?? [] };
        // Providers serving the searched route (names).
        searchedProviders.value = data.providers ?? [];
        // `errors` is [] when clean, or an object keyed by provider on partial failure.
        providerErrors.value = Array.isArray(data.errors) ? {} : (data.errors ?? {});
    } catch (e) {
        if (e.code === 'ERR_CANCELED') {
            return;
        }

        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            searchError.value = e.response?.data?.message ?? 'The flight search failed. Please try again.';
        }
    } finally {
        searching.value = false;
    }
}

const providerErrorList = computed(() => Object.entries(providerErrors.value));
const hasResults = computed(() => results.value && (results.value.outbound.length || results.value.return.length));

// Result groups to render, skipping empties.
const resultGroups = computed(() => {
    if (!results.value) {
        return [];
    }

    return [
        { key: 'outbound', title: 'Outbound', flights: results.value.outbound },
        { key: 'return', title: 'Return', flights: results.value.return },
    ].filter((group) => group.flights.length);
});

function formatPrice(value, currency) {
    if (value === null || value === undefined) {
        return '—';
    }

    return `${currency ?? ''} ${Number(value).toFixed(2)}`.trim();
}

function toggleSelect(groupKey, index) {
    selected[groupKey] = selected[groupKey] === index ? null : index;
}

const isSelected = (groupKey, index) => selected[groupKey] === index;

// The chosen flight object for each leg (null until picked).
const selectedFlights = computed(() => ({
    outbound: selected.outbound !== null ? results.value?.outbound[selected.outbound] ?? null : null,
    return: selected.return !== null ? results.value?.return[selected.return] ?? null : null,
}));

// Combined per-person + total price of the current selection.
const selectionTotals = computed(() => {
    const legs = [selectedFlights.value.outbound, selectedFlights.value.return].filter(Boolean);

    if (!legs.length) {
        return null;
    }

    return {
        currency: legs[0].currency,
        perPerson: legs.reduce((sum, leg) => sum + Number(leg.pricePerPerson ?? 0), 0),
        total: legs.reduce((sum, leg) => sum + Number(leg.totalPrice ?? 0), 0),
    };
});
</script>

<template>
    <AppLayout title="Search Flights" fluid>
        <!-- Form stays centered/constrained; only the results below go full width. -->
        <div class="mx-auto max-w-6xl">
            <Alert v-if="optionsError" type="danger" class="mb-4">{{ optionsError }}</Alert>

            <FullWidthBox title="Search Flights" :collapsible="false">
            <form class="space-y-5" @submit.prevent="submit">
                <!-- Trip type -->
                <div class="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
                    <button
                        v-for="ft in flightTypes"
                        :key="ft.value"
                        type="button"
                        class="rounded-md px-4 py-1.5 font-medium transition"
                        :class="form.flightType === ft.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                        @click="form.flightType = ft.value"
                    >
                        {{ ft.name }}
                    </button>
                </div>

                <!-- Origin / Destination -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Origin</label>
                        <select v-model="form.fromDestinationId" class="w-full appearance-none rounded border border-gray-300 bg-white py-1.5 pl-3 pr-3 text-base focus:border-red-500 focus:ring-1 focus:ring-red-500">
                            <option :value="null">Select origin</option>
                            <option v-for="d in destinations" :key="'o-' + d.id" :value="d.id">
                                {{ d.name }}{{ d.shortcut ? ` (${d.shortcut})` : '' }}
                            </option>
                        </select>
                        <p v-if="errors.fromDestinationId" class="mt-1 text-xs text-red-600">{{ errors.fromDestinationId }}</p>
                    </div>

                    <div class="flex justify-center pb-1 sm:pb-2">
                        <button
                            type="button"
                            class="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-red-500 hover:text-red-600"
                            aria-label="Swap origin and destination"
                            @click="swap"
                        >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </button>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Destination</label>
                        <select v-model="form.toDestinationId" class="w-full appearance-none rounded border border-gray-300 bg-white py-1.5 pl-3 pr-3 text-base focus:border-red-500 focus:ring-1 focus:ring-red-500">
                            <option :value="null">Select destination</option>
                            <option v-for="d in destinationOptions" :key="'d-' + d.id" :value="d.id">
                                {{ d.name }}{{ d.shortcut ? ` (${d.shortcut})` : '' }}
                            </option>
                        </select>
                        <p v-if="errors.toDestinationId" class="mt-1 text-xs text-red-600">{{ errors.toDestinationId }}</p>
                    </div>
                </div>

                <!-- Dates -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DateInput v-model="form.departDate" label="Departure" :error="errors.departDate" />
                    <DateInput
                        v-model="form.returnDate"
                        label="Return"
                        :error="errors.returnDate"
                        :disabled="form.flightType === ONE_WAY"
                    />
                </div>

                <!-- Passengers + flexibility -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div ref="paxRef" class="relative">
                        <label class="mb-1 block text-sm font-medium text-gray-700">Passengers</label>
                        <button
                            type="button"
                            class="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-1.5 text-left text-base focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            @click="paxOpen = !paxOpen"
                        >
                            <span>{{ paxSummary }}</span>
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div v-if="paxOpen" class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                            <div v-for="s in paxSteps" :key="s.key" class="flex items-center justify-between py-2">
                                <div>
                                    <p class="text-sm font-medium text-gray-800">{{ s.label }}</p>
                                    <p class="text-xs text-gray-400">{{ s.hint }}</p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button
                                        type="button"
                                        class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 disabled:opacity-40"
                                        :disabled="form[s.key] <= s.min"
                                        @click="step(s.key, -1)"
                                    >−</button>
                                    <span class="w-4 text-center text-sm font-medium">{{ form[s.key] }}</span>
                                    <button
                                        type="button"
                                        class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 disabled:opacity-40"
                                        :disabled="form[s.key] >= s.max || (s.key === 'infants' && form.infants >= form.adults)"
                                        @click="step(s.key, 1)"
                                    >+</button>
                                </div>
                            </div>
                            <button
                                type="button"
                                class="mt-2 w-full rounded-lg bg-gray-100 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                                @click="paxOpen = false"
                            >
                                Done
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Date flexibility</label>
                        <select v-model.number="form.flexDays" class="w-full appearance-none rounded border border-gray-300 bg-white py-1.5 pl-3 pr-3 text-base focus:border-red-500 focus:ring-1 focus:ring-red-500">
                            <option :value="0">Exact dates</option>
                            <option v-for="fx in flexibilities" :key="fx.value" :value="fx.value">{{ fx.name }}</option>
                        </select>
                    </div>
                </div>

                <Button type="submit" variant="primary" class="w-full justify-center" :disabled="searching">
                    {{ searching ? 'Searching flights…' : 'Search flights' }}
                </Button>
            </form>
            </FullWidthBox>
        </div>

        <!-- Results -->
        <div v-if="searching" class="mt-6"><Loader /></div>

        <template v-else-if="results">
            <div v-if="searchedProviders.length" class="mt-6 flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-gray-500">Providers:</span>
                <span
                    v-for="provider in searchedProviders"
                    :key="provider"
                    class="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                >
                    {{ provider }}
                </span>
            </div>

            <Alert v-if="searchError" type="danger" class="mt-6">{{ searchError }}</Alert>

            <Alert v-for="[provider, message] in providerErrorList" :key="provider" type="warning" class="mt-4">
                <span class="font-medium">{{ provider }}:</span> {{ message }}
            </Alert>

            <p v-if="! hasResults && ! searchError" class="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
                No flights found for this search.
            </p>

            <div v-if="hasResults" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section v-for="group in resultGroups" :key="group.key" class="rounded-lg border border-gray-200 bg-white">
                    <h3 class="border-b border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        {{ group.title }} <span class="text-gray-400">({{ group.flights.length }})</span>
                    </h3>
                    <div class="divide-y divide-gray-100">
                        <button
                            v-for="(flight, i) in group.flights"
                            :key="`${flight.provider}-${flight.id}-${i}`"
                            type="button"
                            class="flex w-full items-stretch gap-4 py-3 pr-4 text-left transition"
                            :class="isSelected(group.key, i) ? 'bg-red-50 ring-1 ring-inset ring-red-400' : 'hover:bg-gray-50'"
                            :aria-pressed="isSelected(group.key, i)"
                            @click="toggleSelect(group.key, i)"
                        >
                            <!-- Full-height selection rail with a radio control -->
                            <span
                                class="flex w-11 shrink-0 items-center justify-center border-r"
                                :class="isSelected(group.key, i) ? 'border-red-200 bg-red-50' : 'border-gray-200'"
                            >
                                <span
                                    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition"
                                    :class="isSelected(group.key, i) ? 'border-red-600' : 'border-gray-300'"
                                >
                                    <span v-if="isSelected(group.key, i)" class="h-2.5 w-2.5 rounded-full bg-red-600" />
                                </span>
                            </span>

                            <div class="flex flex-1 flex-wrap items-center justify-between gap-4">
                            <div class="min-w-[9rem]">
                                <div class="flex items-center gap-2">
                                    <span class="font-semibold text-gray-800">{{ flight.from }} → {{ flight.to }}</span>
                                    <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ flight.flightNo }}</span>
                                </div>
                                <div class="mt-0.5 text-xs text-gray-500">{{ flight.provider }}</div>
                            </div>

                            <div class="text-sm text-gray-700">
                                <div class="text-xs text-gray-500">{{ flight.date }}</div>
                                <div class="font-medium">{{ flight.depTime }} – {{ flight.arrTime }}</div>
                                <div class="text-xs text-gray-500">{{ flight.operator }}</div>
                            </div>

                            <div class="text-xs text-gray-500">
                                <div>Seats: {{ flight.seatsFree ?? flight.seats ?? '—' }}</div>
                                <div>Bag {{ flight.baggage || '—' }}kg · Hand {{ flight.handBaggage || '—' }}kg</div>
                            </div>

                            <div class="text-right">
                                <div class="text-lg font-semibold text-gray-900">{{ formatPrice(flight.pricePerPerson, flight.currency) }}</div>
                                <div class="text-xs text-gray-500">Total {{ formatPrice(flight.totalPrice, flight.currency) }}</div>
                            </div>
                            </div>
                        </button>
                    </div>
                </section>
            </div>

            <!-- Selection summary -->
            <div
                v-if="selectionTotals"
                class="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-5 py-3 shadow-lg"
            >
                <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span v-if="selectedFlights.outbound" class="text-gray-700">
                        <span class="font-medium text-gray-500">Outbound:</span>
                        {{ selectedFlights.outbound.from }} → {{ selectedFlights.outbound.to }} · {{ selectedFlights.outbound.depTime }} · {{ selectedFlights.outbound.provider }}
                    </span>
                    <span v-if="selectedFlights.return" class="text-gray-700">
                        <span class="font-medium text-gray-500">Return:</span>
                        {{ selectedFlights.return.from }} → {{ selectedFlights.return.to }} · {{ selectedFlights.return.depTime }} · {{ selectedFlights.return.provider }}
                    </span>
                </div>
                <div class="text-right">
                    <div class="text-lg font-semibold text-gray-900">{{ formatPrice(selectionTotals.perPerson, selectionTotals.currency) }} <span class="text-xs font-normal text-gray-500">/ person</span></div>
                    <div class="text-xs text-gray-500">Total {{ formatPrice(selectionTotals.total, selectionTotals.currency) }}</div>
                </div>
            </div>
        </template>
    </AppLayout>
</template>
