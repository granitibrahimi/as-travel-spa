<script setup>
import { computed, onMounted, provide, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../helpers/money';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Button from '../../components/Button.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import InputText from '../../components/Form/InputText.vue';
import DateInput from '../../components/Form/DateInput.vue';
import InputNumber from '../../components/Form/InputNumber.vue';
import ServiceRows from '../../components/ServiceRows.vue';
import Alert from '../../components/Alert.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

// The hotel/destination/room/supplier lookups live under /api (siblings of
// /api/v1, the api client's base) so they're addressed with absolute URLs off
// the same origin.
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const destinationsUrl = `${apiOrigin}/api/customers/destinations`;
const hotelsUrl = `${apiOrigin}/api/customers/hotels`;
const roomsUrl = `${apiOrigin}/api/customers/hotel-rooms`;
const suppliersUrl = `${apiOrigin}/api/suppliers`;

const meta = ref(null);
const loading = ref(true);
const errors = ref({});
const processing = ref(false);

const clone = (value) => JSON.parse(JSON.stringify(value));

// Stable client-side ids so option boxes keep their identity when reordered.
let optionUid = 0;
const withUid = (option) => ({ ...option, _uid: ++optionUid });

const form = reactive({
    name: '',
    pax: 2,
    children: 0,
    max_children_age: 0,
    meal: '',
    valid_from: '',
    valid_to: '',
    travel_from: '',
    travel_to: '',
    instagram_url: '',
    code: '',
    lines: [],
    destinations: [],
});

const step = ref(isEdit ? 3 : 1);
const basicCollapsed = ref(false);
const destinationsCollapsed = ref(false);

function blankLine(category) {
    return {
        category,
        description: '',
        supplier_id: null,
        supplier_name: null,
        hotel_id: null,
        hotel_name: null,
        room_id: null,
        room_type: category === meta.value.hotelCategory ? '' : null,
        meal: '',
        price: 0,
        basis: childrenPresent.value
            ? meta.value.perUnitBasis
            : (meta.value.defaultBasis[category] ?? meta.value.perPersonBasis),
    };
}

const blankDestination = () => ({
    parent_destination_id: null,
    name: '',
    nights: 7,
    options: [],
});

onMounted(async () => {
    const { data } = await api.get('/static-offers/form-options');
    meta.value = data;

    if (isEdit) {
        const { data: payload } = await api.get(`/static-offers/${id}/edit`);
        const offer = castResource(payload);

        Object.assign(form, {
            name: offer.name ?? '',
            pax: offer.pax ?? 2,
            children: 0,
            max_children_age: 0,
            meal: offer.meal ?? '',
            valid_from: offer.valid_from ?? '',
            valid_to: offer.valid_to ?? '',
            travel_from: offer.travel_from ?? '',
            travel_to: offer.travel_to ?? '',
            instagram_url: offer.instagram_url ?? '',
            code: offer.code ?? '',
            lines: (offer.lines ?? []).map((line) => ({ ...blankLine(line.category), ...line })),
            destinations: (offer.destinations ?? []).map((destination) => ({
                ...blankDestination(),
                ...destination,
                options: (destination.options ?? []).map((option) => withUid({
                    ...option,
                    services: (option.services ?? []).map((line) => ({ ...blankLine(line.category), ...line })),
                })),
            })),
        });

        if (form.destinations.length === 0) {
            form.destinations = [{ ...blankDestination(), options: [] }];
        }
    } else {
        form.lines = [
            blankLine(1), // FLIGHT
            blankLine(3), // TRANSFER
            blankLine(4), // VISA
            blankLine(meta.value.serviceCategory),
        ];
        form.destinations = [{
            ...blankDestination(),
            options: [
                withUid({ name: 'Hotel 1', description: '', taxes_included: false, transfer_included: false, services: [blankLine(meta.value.hotelCategory)] }),
                withUid({ name: 'Hotel 2', description: '', taxes_included: false, transfer_included: false, services: [blankLine(meta.value.hotelCategory)] }),
            ],
        }];
    }

    loading.value = false;
});

// provide() must run synchronously in setup, so provide a reactive proxy that
// resolves once meta loads (ServiceRows reads it after render).
provide('offerMeta', new Proxy({}, {
    get: (_, key) => {
        if (!meta.value) {
            return undefined;
        }

        const map = {
            categories: meta.value.categories,
            bases: meta.value.bases,
            meals: meta.value.meals,
            defaultBasis: meta.value.defaultBasis,
            hotelCategory: meta.value.hotelCategory,
            serviceCategory: meta.value.serviceCategory,
            perPersonBasis: meta.value.perPersonBasis,
            perUnitBasis: meta.value.perUnitBasis,
            suppliersUrl,
            hotelsUrl,
            hotelStoreUrl: hotelsUrl,
            roomsUrl,
        };

        return map[key];
    },
}));

function validateBasic() {
    let valid = true;
    delete errors.value.name;
    delete errors.value.pax;

    if (!form.name.trim()) {
        errors.value = { ...errors.value, name: 'Offer name is required.' };
        valid = false;
    }

    if (!form.pax || parseInt(form.pax) < 1) {
        errors.value = { ...errors.value, pax: 'At least one adult traveller is required.' };
        valid = false;
    }

    return valid;
}

function nextFromBasic() {
    if (!validateBasic()) {
        return;
    }

    basicCollapsed.value = true;

    if (step.value < 2) {
        step.value = 2;
    }
}

function validateDestinations() {
    let valid = form.destinations.length > 0;

    form.destinations.forEach((destination, i) => {
        delete errors.value[`destinations.${i}.parent_destination_id`];

        if (!destination.parent_destination_id) {
            errors.value = { ...errors.value, [`destinations.${i}.parent_destination_id`]: 'Choose a destination.' };
            valid = false;
        }
    });

    return valid;
}

function nextFromDestinations() {
    if (!validateDestinations()) {
        return;
    }

    destinationsCollapsed.value = true;

    if (step.value < 3) {
        step.value = 3;
    }
}

// When the offer includes children, every price is charged per family (per unit).
const childrenPresent = computed(() => Number(form.children) > 0);

watch(childrenPresent, (present) => {
    if (!present) {
        return;
    }

    form.lines.forEach((line) => {
        line.basis = meta.value.perUnitBasis;
    });
    form.destinations.forEach((destination) => {
        (destination.options ?? []).forEach((option) => {
            (option.services ?? []).forEach((line) => {
                line.basis = meta.value.perUnitBasis;
            });
        });
    });
});

const addCommon = () => form.lines.push(blankLine(meta.value.otherCategory));
const removeCommon = (index) => form.lines.splice(index, 1);

const addDestination = () => form.destinations.push(blankDestination());
const removeDestination = (index) => form.destinations.splice(index, 1);

function onDestinationChange(destination, option) {
    destination.name = option ? option.label : '';
}

const destinationTitle = (destination, index) => destination.name || `Destination ${index + 1}`;

const addOption = (destination) => destination.options.push(withUid({
    name: `Option ${destination.options.length + 1}`,
    description: '',
    taxes_included: false,
    transfer_included: false,
    services: [blankLine(meta.value.hotelCategory)],
}));
const removeOption = (destination, index) => destination.options.splice(index, 1);

function moveOption(destination, index, delta) {
    const target = index + delta;

    if (target < 0 || target >= destination.options.length) {
        return;
    }

    const [option] = destination.options.splice(index, 1);
    destination.options.splice(target, 0, option);
}

function cloneOption(destination, index) {
    const copy = withUid(clone(destination.options[index]));
    copy.name = `${copy.name || 'Option'} (copy)`;

    destination.options.splice(index + 1, 0, copy);
}
const addOptionService = (option) => option.services.push(blankLine(meta.value.hotelCategory));
const removeOptionService = (option, index) => option.services.splice(index, 1);

const flatOptionIndex = (di, oi) => form.destinations
    .slice(0, di)
    .reduce((count, destination) => count + destination.options.length, 0) + oi;

// --- Live pricing (mirrors StaticOfferPricer) ---
const pax = computed(() => Math.max(parseInt(form.pax) || 1, 1));

function lineContribution(line) {
    const price = parseFloat(line.price) || 0;
    return parseInt(line.basis) === meta.value.perPersonBasis ? price * pax.value : price;
}

const commonTotal = computed(() => form.lines.reduce((sum, line) => sum + lineContribution(line), 0));

const summaryRows = computed(() => form.destinations.flatMap((destination, di) =>
    (destination.options ?? []).map((option) => {
        const optionTotal = (option.services ?? []).reduce((sum, line) => sum + lineContribution(line), 0);
        const groupTotal = commonTotal.value + optionTotal;

        return {
            name: `${destinationTitle(destination, di)} · ${option.name || 'Option'}`,
            services: option.services ?? [],
            optionTotal,
            groupTotal,
            perPerson: Math.round(groupTotal / pax.value),
        };
    })));

const detailed = ref(false);

const categoryLabel = (value) => meta.value.categories.find((c) => c.value === parseInt(value))?.label ?? '';
const mealLabel = (value) => meta.value.meals.find((m) => String(m.value) === String(value))?.label ?? '';
const basisLabel = (value) => meta.value.bases.find((b) => b.value === parseInt(value))?.label ?? '';

function lineLabel(line) {
    const parts = [line.hotel_name, line.room_type, mealLabel(line.meal), line.description, line.supplier_name]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean);

    return parts.join(' · ') || categoryLabel(line.category) || 'Service';
}

const totalNights = computed(() => form.destinations.reduce(
    (sum, destination) => sum + (parseInt(destination.nights) || 0),
    0,
));

function formatDate(value) {
    if (!value) {
        return '';
    }

    const [year, month, day] = value.split('-');

    return `${day}.${month}.${year}`;
}

// The line/option shapes carry client-only helper keys (hotel_name, _uid) the
// API doesn't accept — strip them before sending.
function cleanLine(line) {
    const { hotel_name, ...rest } = line;
    return {
        ...rest,
        meal: rest.meal === '' ? null : rest.meal,
    };
}

function buildPayload() {
    const destinations = form.destinations;

    return {
        name: form.name,
        code: form.code || null,
        pax: form.pax,
        meal: form.meal === '' ? null : form.meal,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        travel_from: form.travel_from || null,
        travel_to: form.travel_to || null,
        instagram_url: form.instagram_url || null,
        parent_destination_id: destinations[0]?.parent_destination_id ?? null,
        nights: destinations.reduce((sum, d) => sum + (parseInt(d.nights) || 0), 0) || null,
        lines: form.lines.map(cleanLine),
        destinations: destinations.map((destination, sort) => ({
            parent_destination_id: destination.parent_destination_id,
            nights: destination.nights,
            sort,
        })),
        options: destinations.flatMap((destination) => (destination.options ?? []).map((option) => ({
            name: option.name,
            description: option.description ?? '',
            taxes_included: Boolean(option.taxes_included),
            transfer_included: Boolean(option.transfer_included),
            parent_destination_id: destination.parent_destination_id,
            services: (option.services ?? []).map(cleanLine),
        }))),
    };
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const payload = buildPayload();
        await (isEdit ? api.put(`/static-offers/${id}`, payload) : api.post('/static-offers', payload));
        router.push(routeUrl('staticOffers.list'));
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
    <AppLayout :title="isEdit ? 'Edit static offer' : 'New static offer'" fluid>
        <Loader v-if="loading" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <!-- Left: summary -->
            <aside class="lg:col-span-1">
                <div class="space-y-6 lg:sticky lg:top-20">
                    <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                        <h2 class="mb-4 text-lg font-semibold">Offer summary</h2>
                        <dl class="space-y-2 text-sm">
                            <div class="flex justify-between gap-4">
                                <dt class="text-gray-500">Name</dt>
                                <dd class="text-right font-medium">{{ form.name || '—' }}</dd>
                            </div>
                            <div v-if="form.instagram_url" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Instagram</dt>
                                <dd class="truncate text-right font-medium">{{ form.instagram_url }}</dd>
                            </div>
                            <div class="flex justify-between gap-4">
                                <dt class="text-gray-500">PAX</dt>
                                <dd class="text-right font-medium">{{ form.pax }}</dd>
                            </div>
                            <div v-if="Number(form.children) > 0" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Children</dt>
                                <dd class="text-right font-medium">
                                    {{ form.children }}
                                    <span v-if="Number(form.max_children_age) > 0" class="text-gray-400">· max age {{ form.max_children_age }}</span>
                                </dd>
                            </div>
                            <div v-for="(destination, di) in form.destinations" :key="di" class="flex justify-between gap-4">
                                <dt class="text-gray-500">{{ destinationTitle(destination, di) }}</dt>
                                <dd class="text-right font-medium">{{ destination.nights || 0 }} nights</dd>
                            </div>
                            <div v-if="form.destinations.length > 1" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Total nights</dt>
                                <dd class="text-right font-medium">{{ totalNights }}</dd>
                            </div>
                            <div v-if="form.valid_from || form.valid_to" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Valid period</dt>
                                <dd class="text-right font-medium">{{ formatDate(form.valid_from) || '…' }} – {{ formatDate(form.valid_to) || '…' }}</dd>
                            </div>
                            <div v-if="form.travel_from || form.travel_to" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Travel period</dt>
                                <dd class="text-right font-medium">{{ formatDate(form.travel_from) || '…' }} – {{ formatDate(form.travel_to) || '…' }}</dd>
                            </div>
                        </dl>
                    </section>

                    <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                        <Alert v-if="childrenPresent" type="warning" class="mb-3">
                            All prices are per family.
                        </Alert>
                        <div class="mb-3 flex items-start justify-between gap-2">
                            <div v-if="childrenPresent" class="text-xs font-medium uppercase text-gray-500">Per family pricing · {{ pax }} adults + {{ form.children }} children</div>
                            <div v-else class="text-xs font-medium uppercase text-gray-500">Per person pricing · {{ pax }} travellers</div>
                            <button type="button" class="whitespace-nowrap text-xs font-medium text-red-600 hover:underline" @click="detailed = !detailed">
                                {{ detailed ? 'Hide details' : 'Show details' }}
                            </button>
                        </div>

                        <div v-if="detailed" class="mb-3 rounded border border-gray-200 bg-gray-50 p-2.5">
                            <div class="mb-1 text-xs font-medium uppercase text-gray-500">Common services</div>
                            <p v-if="form.lines.length === 0" class="py-1 text-xs text-gray-400">No common services.</p>
                            <div v-for="(line, li) in form.lines" :key="li" class="flex items-start justify-between gap-2 border-b border-gray-200 py-1 text-xs last:border-0">
                                <span class="min-w-0">
                                    <span class="block truncate">{{ lineLabel(line) }}</span>
                                    <span class="text-gray-400">{{ categoryLabel(line.category) }} · {{ basisLabel(line.basis) }}</span>
                                </span>
                                <span class="whitespace-nowrap font-medium">{{ money(lineContribution(line)) }}</span>
                            </div>
                            <div class="flex justify-between pt-1.5 text-xs font-semibold">
                                <span>Common total</span>
                                <span>{{ money(commonTotal) }}</span>
                            </div>
                        </div>

                        <div v-for="(row, i) in summaryRows" :key="i" class="border-b py-1.5 last:border-0">
                            <div class="flex items-center justify-between">
                                <span class="truncate pr-2">{{ row.name }}</span>
                                <span class="whitespace-nowrap text-right">
                                    <span class="font-semibold text-green-600">{{ money(row.perPerson) }}</span>
                                    <span class="block text-xs text-gray-400">{{ money(row.groupTotal) }}</span>
                                </span>
                            </div>

                            <div v-if="detailed" class="mb-1 mt-1.5 space-y-1 rounded border border-gray-100 bg-gray-50 p-2">
                                <p v-if="row.services.length === 0" class="text-xs text-gray-400">No services yet.</p>
                                <div v-for="(line, li) in row.services" :key="li" class="flex items-start justify-between gap-2 text-xs">
                                    <span class="min-w-0">
                                        <span class="block truncate">{{ lineLabel(line) }}</span>
                                        <span class="text-gray-400">{{ categoryLabel(line.category) }} · {{ basisLabel(line.basis) }}</span>
                                    </span>
                                    <span class="whitespace-nowrap font-medium">{{ money(lineContribution(line)) }}</span>
                                </div>
                                <div class="flex justify-between border-t border-gray-200 pt-1 text-xs text-gray-500">
                                    <span>Option {{ money(row.optionTotal) }} + common {{ money(commonTotal) }}</span>
                                    <span class="font-semibold text-gray-700">{{ money(row.groupTotal) }}</span>
                                </div>
                            </div>
                        </div>
                        <p class="mt-3 text-xs text-gray-500">Common services: {{ money(commonTotal) }}. Per person = (common + option) ÷ pax.</p>
                    </section>
                </div>
            </aside>

            <!-- Right: form -->
            <form class="space-y-6 lg:col-span-3" @submit.prevent="submit">
                <FullWidthBox title="Basic information" :collapsed="basicCollapsed">
                    <InputText v-model="form.name" label="Offer name *" placeholder="e.g. Maldives 7n · AI · couple" :error="errors.name" />

                    <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <DateInput
                            v-for="field in [
                                { key: 'valid_from', label: 'Valid from' },
                                { key: 'valid_to', label: 'Valid to' },
                                { key: 'travel_from', label: 'Travel from' },
                                { key: 'travel_to', label: 'Travel to' },
                            ]"
                            :key="field.key"
                            v-model="form[field.key]"
                            :label="field.label"
                            :error="errors[field.key]"
                        />
                    </div>

                    <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                        <InputNumber v-model="form.pax" label="Travellers (adult) *" min="1" :error="errors.pax" />
                        <InputNumber v-model="form.children" label="Children" min="0" />
                        <InputNumber v-model="form.max_children_age" label="Max children age" min="0" />
                    </div>

                    <div class="mt-4">
                        <InputText v-model="form.instagram_url" label="Instagram post URL" placeholder="https://www.instagram.com/p/…" :error="errors.instagram_url" />
                    </div>

                    <template v-if="step === 1" #footer>
                        <Button variant="primary" size="sm" @click="nextFromBasic">Next</Button>
                    </template>
                </FullWidthBox>

                <FullWidthBox v-if="step >= 2" title="Destinations" :collapsed="destinationsCollapsed">
                    <p v-if="errors.parent_destination_id" class="mb-2 text-xs text-red-600">{{ errors.parent_destination_id }}</p>
                    <div class="space-y-3">
                        <div v-for="(destination, di) in form.destinations" :key="di" class="grid grid-cols-1 gap-3 md:grid-cols-12">
                            <div class="md:col-span-8">
                                <AsyncSelect
                                    v-model="destination.parent_destination_id"
                                    :url="destinationsUrl"
                                    :label="di === 0 ? 'Destination *' : `Destination ${di + 1} *`"
                                    placeholder="Choose destination…"
                                    :initial-option="destination.parent_destination_id ? { id: destination.parent_destination_id, name: destination.name } : null"
                                    :error="errors[`destinations.${di}.parent_destination_id`]"
                                    @change="(option) => onDestinationChange(destination, option)"
                                />
                            </div>
                            <div class="md:col-span-3">
                                <InputNumber v-model="destination.nights" label="Nights" min="0" :error="errors[`destinations.${di}.nights`]" />
                            </div>
                            <div class="flex items-end md:col-span-1">
                                <Button v-if="form.destinations.length > 1" variant="danger" @click="removeDestination(di)">✕</Button>
                            </div>
                        </div>
                    </div>

                    <template #footer>
                        <div class="flex w-full items-center justify-between">
                            <Button size="sm" @click="addDestination">+ Destination</Button>
                            <Button v-if="step === 2" variant="primary" size="sm" @click="nextFromDestinations">Next</Button>
                        </div>
                    </template>
                </FullWidthBox>

                <FullWidthBox v-if="step >= 3" title="Common services">
                    <Alert v-if="childrenPresent" type="warning" class="mb-3">
                        Add flights for each person (including children over 2 years old).
                    </Alert>
                    <ServiceRows :rows="form.lines" :lock-basis="childrenPresent"
                                 :destination-id="form.destinations[0]?.parent_destination_id ?? null"
                                 :destination-name="form.destinations[0]?.name ?? ''"
                                 @remove="removeCommon" />

                    <template #footer>
                        <button type="button" class="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addCommon">+ Service</button>
                    </template>
                </FullWidthBox>

                <template v-for="(destination, di) in form.destinations" :key="di">
                    <template v-if="step >= 3 && destination.parent_destination_id">
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold">{{ destinationTitle(destination, di) }} Options</h2>
                            <button type="button" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addOption(destination)">+ Option</button>
                        </div>

                        <p v-if="destination.options.length === 0" class="text-sm text-gray-400">No options for this destination yet.</p>

                        <FullWidthBox
                            v-for="(option, oi) in destination.options"
                            :key="option._uid ?? `${di}-${oi}`"
                            :title="option.name || `Option ${oi + 1}`"
                        >
                            <template #actions>
                                <button type="button" title="Move up" class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="oi === 0" @click="moveOption(destination, oi, -1)">↑</button>
                                <button type="button" title="Move down" class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="oi === destination.options.length - 1" @click="moveOption(destination, oi, 1)">↓</button>
                                <button type="button" title="Duplicate this option" class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50" @click="cloneOption(destination, oi)">⧉ Clone</button>
                            </template>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <InputText v-model="option.name" label="Name *" :error="errors[`options.${flatOptionIndex(di, oi)}.name`]" />

                                <div class="flex items-end gap-6 pb-1.5">
                                    <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                        <input v-model="option.taxes_included" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500">
                                        Taxes included
                                    </label>
                                    <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                        <input v-model="option.transfer_included" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500">
                                        Transfer included
                                    </label>
                                </div>
                            </div>

                            <div class="mt-4">
                                <ServiceRows :rows="option.services" :lock-basis="childrenPresent"
                                             :destination-id="destination.parent_destination_id"
                                             :destination-name="destinationTitle(destination, di)"
                                             @remove="(i) => removeOptionService(option, i)" />
                            </div>

                            <template #footer>
                                <div class="flex w-full items-center justify-between">
                                    <button type="button" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addOptionService(option)">+ Service</button>
                                    <button type="button" class="inline-flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-sm text-red-600 hover:bg-red-100" @click="removeOption(destination, oi)">
                                        <span>✕</span> Remove option
                                    </button>
                                </div>
                            </template>
                        </FullWidthBox>
                    </template>
                </template>

                <footer v-if="step >= 3" class="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                    <div class="flex flex-wrap items-center gap-2">
                        <template v-for="(destination, di) in form.destinations" :key="di">
                            <Button v-if="destination.parent_destination_id" size="sm" @click="addOption(destination)">
                                + Option for {{ destinationTitle(destination, di) }}
                            </Button>
                        </template>
                    </div>

                    <div class="flex items-center gap-3">
                        <RouterLink :to="routeUrl('staticOffers.list')" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                        <Button type="submit" variant="primary" :disabled="processing">
                            {{ processing ? 'Saving…' : 'Save offer' }}
                        </Button>
                    </div>
                </footer>
            </form>
        </div>
    </AppLayout>
</template>
