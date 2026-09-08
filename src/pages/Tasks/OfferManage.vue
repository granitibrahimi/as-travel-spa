<script setup>
import { computed, onMounted, provide, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../helpers/money';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import DateInput from '../../components/Form/DateInput.vue';
import ServiceRows from '../../components/ServiceRows.vue';
import Alert from '../../components/Alert.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const taskId = route.params.taskId;
const offerRequestId = route.params.offerRequestId;
const base = `/tasks/${taskId}/offer-requests/${offerRequestId}/offers`;

const offerId = ref(route.params.offerId ?? null);
const isEdit = computed(() => Boolean(offerId.value));
const pageTitle = computed(() => [isEdit.value ? 'Edit' : 'Prepare', typeName.value, 'offer'].filter(Boolean).join(' '));

// Hotel/room/supplier lookups live under /api (siblings of /api/v1, the api
// client's base) so they're addressed with absolute URLs off the same origin.
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const suppliersUrl = `${apiOrigin}/api/suppliers`;
const hotelsUrl = `${apiOrigin}/api/customers/hotels`;
const roomsUrl = `${apiOrigin}/api/customers/hotel-rooms`;

const meta = ref(null);
const loading = ref(true);
const errors = ref({});
const processing = ref(false);
const savedAt = ref(null);
const parentWarning = ref(false);

// The offer request's type shapes the form: which common services are seeded,
// whether hotel options exist, and how many are allowed. `typeRules` is the
// backend's PreparedOfferRules payload; `typeName` is 'Ticket' | 'Hotel' |
// 'Package' | 'Tour' (or null).
const typeName = ref(null);
const typeRules = ref(null);

// OfferCategoryEnum values (stable) — same hardcoding as StaticOffers/Manage.vue.
const CATEGORY = { FLIGHT: 1, HOTEL: 2, TRANSFER: 3, VISA: 4, INSURANCE: 5 };

// Common-service lines + hotel-option count seeded for a fresh offer, per type.
const SEED = {
    Ticket: { common: [CATEGORY.FLIGHT], options: 0 },
    Hotel: { common: [], options: 1 },
    Package: { common: [CATEGORY.FLIGHT, CATEGORY.VISA, CATEGORY.TRANSFER, CATEGORY.INSURANCE], options: 1 },
    Tour: { common: [CATEGORY.FLIGHT, CATEGORY.VISA, CATEGORY.TRANSFER, CATEGORY.INSURANCE], options: 2 },
};

let optionUid = 0;
const withUid = (option) => ({ ...option, _uid: ++optionUid });
const clone = (value) => JSON.parse(JSON.stringify(value));

const form = reactive({
    name: '',
    pax: 2,
    children_ages: [],
    valid_to: '',
    lines: [],
    destinations: [],
});

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

const blankOption = (index) => withUid({
    name: `Hotel ${index}`,
    description: '',
    taxes_included: false,
    transfer_included: false,
    services: [blankLine(meta.value.hotelCategory)],
});

onMounted(async () => {
    const [{ data: options }, { data: edited }] = await Promise.all([
        api.get(`${base}/form`),
        isEdit.value ? api.get(`${base}/${offerId.value}/edit`) : Promise.resolve({ data: null }),
    ]);

    meta.value = options;
    typeName.value = (edited ? castResource(edited).type_name : options.prefill.type_name) ?? null;
    typeRules.value = (edited ? castResource(edited).rules : options.prefill.rules) ?? null;

    if (edited) {
        const offer = castResource(edited);

        Object.assign(form, {
            name: offer.name ?? '',
            pax: offer.pax ?? 2,
            children_ages: [...(offer.children ?? [])],
            valid_to: offer.valid_to ?? '',
            lines: (offer.lines ?? []).map((line) => ({ ...blankLine(line.category), ...line })),
            destinations: (offer.destinations ?? []).map((destination) => ({
                parent_destination_id: destination.parent_destination_id,
                name: destination.name,
                nights: destination.nights,
                options: (destination.options ?? []).map((option) => withUid({
                    ...option,
                    services: (option.services ?? []).map((line) => ({ ...blankLine(line.category), ...line })),
                })),
            })),
        });
    } else {
        const prefill = options.prefill;
        const seed = SEED[typeName.value] ?? {
            common: [CATEGORY.FLIGHT, CATEGORY.TRANSFER, CATEGORY.VISA, meta.value.serviceCategory],
            options: 2,
        };

        Object.assign(form, {
            name: prefill.name ?? '',
            pax: prefill.pax ?? 2,
            children_ages: [...(prefill.children ?? [])],
            valid_to: '',
            lines: seed.common.map((category) => blankLine(category)),
            destinations: (prefill.destinations ?? []).map((destination) => ({
                parent_destination_id: destination.parent_destination_id,
                name: destination.name ?? destination.child_name,
                nights: destination.nights,
                options: Array.from({ length: seed.options }, (_, i) => blankOption(i + 1)),
            })),
        });
    }

    parentWarning.value = form.destinations.some((destination) => !destination.parent_destination_id);
    loading.value = false;
});

// provide() must run synchronously in setup; resolve once meta loads.
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

// When the party includes children every price is charged per family (per unit).
const childrenPresent = computed(() => form.children_ages.length > 0);

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

// Category dropdowns are limited to what the request type allows.
const commonCategoryOptions = computed(() => {
    const allowed = typeRules.value?.common_categories;
    return allowed ? meta.value.categories.filter((c) => allowed.includes(c.value)) : meta.value.categories;
});
const optionCategoryOptions = computed(() => {
    const allowed = typeRules.value?.option_categories;
    return allowed ? meta.value.categories.filter((c) => allowed.includes(c.value)) : meta.value.categories;
});

// Hotel options are hidden entirely for types that don't allow them (Ticket),
// but a pre-existing option on an edited offer is still shown.
const showOptions = computed(() => (typeRules.value?.allows_options ?? true)
    || form.destinations.some((destination) => destination.options.length > 0));

function canAddOption(destination) {
    const max = typeRules.value?.max_options;
    return max === null || max === undefined || destination.options.length < max;
}

const addCommon = () => form.lines.push(blankLine(commonCategoryOptions.value[0]?.value ?? meta.value.otherCategory));
const removeCommon = (index) => form.lines.splice(index, 1);

const destinationTitle = (destination, index) => destination.name || `Destination ${index + 1}`;

const addOption = (destination) => {
    if (!canAddOption(destination)) {
        return;
    }

    destination.options.push(withUid({
        name: `Option ${destination.options.length + 1}`,
        description: '',
        taxes_included: false,
        transfer_included: false,
        services: [blankLine(optionCategoryOptions.value[0]?.value ?? meta.value.hotelCategory)],
    }));
};
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

const addOptionService = (option) => option.services.push(blankLine(optionCategoryOptions.value[0]?.value ?? meta.value.hotelCategory));
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

// The line shapes carry client-only helper keys the API doesn't accept.
function cleanLine(line) {
    const { hotel_name, _uid, ...rest } = line;
    return {
        ...rest,
        meal: rest.meal === '' ? null : rest.meal,
    };
}

function buildPayload() {
    return {
        name: form.name || null,
        pax: form.pax,
        children: form.children_ages.map(Number),
        valid_to: form.valid_to || null,
        destinations: form.destinations.map((destination) => ({
            parent_destination_id: destination.parent_destination_id,
            nights: destination.nights,
        })),
        lines: form.lines.map(cleanLine),
        options: form.destinations.flatMap((destination) => (destination.options ?? []).map((option) => ({
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
    if (processing.value || parentWarning.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const payload = buildPayload();

        if (isEdit.value) {
            await api.put(`${base}/${offerId.value}`, payload);
        } else {
            const { data } = await api.post(base, payload);
            offerId.value = data.id;
            router.replace(routeUrl('taskRequestOffers.edit', [taskId, offerRequestId, data.id]));
        }

        savedAt.value = new Date();
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
    <AppLayout :title="pageTitle" fluid>
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
                            <div class="flex justify-between gap-4">
                                <dt class="text-gray-500">Travellers</dt>
                                <dd class="text-right font-medium">
                                    {{ form.pax }}
                                    <span v-if="form.children_ages.length" class="text-gray-400">
                                        + {{ form.children_ages.length }} children ({{ form.children_ages.join(', ') }} y)
                                    </span>
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
                            <div v-if="form.valid_to" class="flex justify-between gap-4">
                                <dt class="text-gray-500">Valid until</dt>
                                <dd class="text-right font-medium">{{ form.valid_to }}</dd>
                            </div>
                        </dl>
                    </section>

                    <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                        <Alert v-if="childrenPresent" type="warning" class="mb-3">
                            All prices are per family.
                        </Alert>
                        <div class="mb-3 flex items-start justify-between gap-2">
                            <div v-if="childrenPresent" class="text-xs font-medium uppercase text-gray-500">Per family pricing · {{ pax }} adults + {{ form.children_ages.length }} children</div>
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
                        </div>
                        <p class="mt-3 text-xs text-gray-500">Common services: {{ money(commonTotal) }}. Per person = (common + option) ÷ pax.</p>
                    </section>
                </div>
            </aside>

            <!-- Right: form -->
            <form class="space-y-6 lg:col-span-3" @submit.prevent="submit">
                <Alert v-if="parentWarning" type="error">
                    One or more destinations on this request have no parent destination. Set the parent on the
                    destination record before preparing an offer.
                </Alert>

                <FullWidthBox title="Offer details" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputText v-model="form.name" label="Offer name" placeholder="e.g. Maldives 7n · AI · couple" :error="errors.name" />
                        <DateInput v-model="form.valid_to" label="Valid until" :error="errors.valid_to" />
                    </div>

                    <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                        <div class="mb-1 text-xs font-medium uppercase text-gray-500">
                            From the offer request<template v-if="typeName"> · {{ typeName }}</template>
                        </div>
                        <p>
                            <span class="font-medium">{{ form.pax }}</span> adults<template v-if="form.children_ages.length">,
                            <span class="font-medium">{{ form.children_ages.length }}</span> children ({{ form.children_ages.join(', ') }} y)</template>
                        </p>
                        <ul class="mt-1 space-y-0.5">
                            <li v-for="(destination, di) in form.destinations" :key="di">
                                {{ destinationTitle(destination, di) }} · {{ destination.nights || 0 }} nights
                            </li>
                        </ul>
                        <p class="mt-1 text-xs text-gray-400">Edit the offer request to change travellers or destinations.</p>
                    </div>
                </FullWidthBox>

                <FullWidthBox :title="typeName === 'Ticket' ? 'Flight & services' : 'Common services'">
                    <Alert v-if="childrenPresent" type="warning" class="mb-3">
                        Add flights for each person (including children over 2 years old).
                    </Alert>
                    <p v-if="form.lines.length === 0" class="mb-2 text-sm text-gray-400">
                        No common services. Use “+ Service” to add visa or transfer.
                    </p>
                    <ServiceRows :rows="form.lines" :lock-basis="childrenPresent"
                                 :categories="commonCategoryOptions"
                                 :destination-id="form.destinations[0]?.parent_destination_id ?? null"
                                 :destination-name="form.destinations[0]?.name ?? ''"
                                 @remove="removeCommon" />

                    <template #footer>
                        <button type="button" class="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addCommon">+ Service</button>
                    </template>
                </FullWidthBox>

                <template v-for="(destination, di) in form.destinations" :key="di">
                    <template v-if="destination.parent_destination_id && (showOptions || destination.options.length)">
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold">{{ destinationTitle(destination, di) }} Options</h2>
                            <button v-if="canAddOption(destination)" type="button" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addOption(destination)">+ Option</button>
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
                                             :categories="optionCategoryOptions"
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

                <footer class="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                        <RouterLink :to="routeUrl('tasks.show', taskId)" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 hover:bg-gray-50">← Back to task</RouterLink>
                        <span v-if="savedAt" class="text-green-600">Saved ✓</span>
                    </div>

                    <div class="flex items-center gap-3">
                        <RouterLink v-if="isEdit" :to="routeUrl('taskRequestOffers.show', [taskId, offerRequestId, offerId])" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">View</RouterLink>
                        <Button type="submit" variant="primary" :disabled="processing || parentWarning">
                            {{ processing ? 'Saving…' : (isEdit ? 'Save changes' : 'Create offer') }}
                        </Button>
                    </div>
                </footer>
            </form>
        </div>
    </AppLayout>
</template>
