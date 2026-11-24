<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { money } from '../../../helpers/money.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import SideOverlay from '../../../components/SideOverlay.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import DatePicker from '../../../components/Form/DatePicker.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import CheckboxDropdown from '../../../components/Form/CheckboxDropdown.vue';

const route = useRoute();
const id = route.params.id;
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const hotelsUrl = `${apiOrigin}/api/customers/hotels`;

const contract = ref(null);
const openRoom = ref(null);

async function load() {
    contract.value = castResource((await api.get(`/hotel-contracts/${id}`)).data);
}
onMounted(load);

const canEdit = computed(() => Boolean(contract.value?.can_edit));
const roomName = (code) => contract.value?.room_options.find((r) => r.code === code)?.name ?? code;
const roomsLabel = (codes) => (codes?.length ? codes.map(roomName).join(', ') : 'All rooms');
const roomOptions = computed(() => (contract.value?.room_options ?? []).map((r) => ({ value: r.code, label: r.name })));
const window_ = (from, to) => (from || to ? `${from ?? '…'} – ${to ?? '…'}` : 'Any');

// ---------------------------------------------------------------- editor
const SECTIONS = {
    eb: { url: 'early-bookings', title: 'Early booking' },
    spo: { url: 'special-offers', title: 'Special offer' },
    markup: { url: 'markups', title: 'Markup rule' },
};
const editor = ref(null); // { kind, id, form }
const errors = ref({});
const saving = ref(false);

function blank(kind) {
    if (kind === 'eb') return { code: '', booking_from: '', booking_to: '', stay_from: '', stay_to: '', discount_percent: null, prepayment_percent: null, payment_deadline: '', active: true };
    if (kind === 'spo') return { code: '', name: '', type: 'percent', discount_percent: null, booking_from: '', booking_to: '', stay_windows: [], room_codes: [], min_nights: null, combinable_with_eb: true, combinable_with_offers: true, match_adults: 2, match_children: 2, charge_adults: 2, charge_children: 0, on_request: false, active: true, notes: '' };
    return { code: '', priority: 10, channel: null, booking_from: '', booking_to: '', checkin_from: '', checkin_to: '', room_codes: [], markup_percent: null, active: true };
}

function openEditor(kind, row = null) {
    errors.value = {};
    const form = { ...blank(kind), ...(row ? JSON.parse(JSON.stringify(row)) : {}) };
    Object.keys(form).forEach((k) => { if (form[k] === null && typeof blank(kind)[k] === 'string') form[k] = ''; });
    editor.value = { kind, id: row?.id ?? null, form };
}

function openHeader() {
    errors.value = {};
    const c = contract.value;
    editor.value = {
        kind: 'header',
        form: {
            hotel_id: c.hotel?.id ?? null, supplier_id: c.supplier?.id ?? null, code: c.code, name: c.name, board: c.board ?? '',
            valid_from: c.valid_from, valid_to: c.valid_to, infant_age_max: c.infant_age_max, child_age_max: c.child_age_max,
            infants_free: c.infants_free, booking_fee: c.booking_fee, booking_fee_per: c.booking_fee_per,
            commission_percent: c.commission_percent, rounding: c.rounding, active: c.active, notes: c.notes ?? '',
        },
    };
}

async function save() {
    if (saving.value || ! editor.value) return;
    saving.value = true;
    errors.value = {};
    const { kind, id: rowId, form } = editor.value;
    try {
        if (kind === 'header') {
            await api.put(`/hotel-contracts/${id}`, form);
        } else {
            const base = `/hotel-contracts/${id}/${SECTIONS[kind].url}`;
            await (rowId ? api.put(`${base}/${rowId}`, form) : api.post(base, form));
        }
        editor.value = null;
        await load();
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(Object.entries(error.response.data.errors ?? {}).map(([k, v]) => [k, v[0]]));
        } else {
            throw error;
        }
    } finally {
        saving.value = false;
    }
}

async function toggleActive(kind, row) {
    await api.put(`/hotel-contracts/${id}/${SECTIONS[kind].url}/${row.id}`, { ...row, active: ! row.active });
    await load();
}

const toDelete = ref(null); // { kind, row }
const deleting = ref(false);
async function confirmDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        await api.delete(`/hotel-contracts/${id}/${SECTIONS[toDelete.value.kind].url}/${toDelete.value.row.id}`);
        toDelete.value = null;
        await load();
    } finally {
        deleting.value = false;
    }
}

const editorTitle = computed(() => {
    if (! editor.value) return '';
    if (editor.value.kind === 'header') return 'Edit contract';
    return `${editor.value.id ? 'Edit' : 'New'} ${SECTIONS[editor.value.kind].title.toLowerCase()}`;
});
const typeOptions = computed(() => (contract.value?.special_offer_types ?? []).map((t) => ({ value: t.id, label: t.name })));
const channelOptions = [{ value: 'B2C', label: 'B2C' }, { value: 'B2B', label: 'B2B' }];
const feePerOptions = [{ value: 'booking', label: 'Per booking' }, { value: 'pax', label: 'Per person' }, { value: 'night', label: 'Per night' }];
const roundingOptions = [{ value: 'nearest_1', label: 'Nearest 1 €' }, { value: 'nearest_5', label: 'Nearest 5 €' }, { value: 'none', label: 'Cents' }];
const pad2 = (v) => (v === null || v === undefined ? '—' : `${v}%`);
</script>

<template>
    <AppLayout :title="contract ? `${contract.code}` : 'Hotel Contract'" fluid>
        <Loader v-if="! contract" />
        <template v-else>
            <FullWidthBox :title="`${contract.name} (${contract.code})`" :collapsible="false">
                <template #actions>
                    <Button v-if="canEdit" size="sm" @click="openHeader">Edit</Button>
                </template>
                <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                    <div><div class="text-xs uppercase text-gray-500">Hotel</div>{{ contract.hotel?.title ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Supplier</div>{{ contract.supplier?.name ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Valid</div>{{ contract.valid_from }} – {{ contract.valid_to }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Status</div>{{ contract.active ? 'Active' : 'Inactive' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Board</div>{{ contract.board ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Ages</div>Infant 0-{{ contract.infant_age_max }}, child to {{ contract.child_age_max }}<span v-if="contract.infants_free">, infants free</span></div>
                    <div><div class="text-xs uppercase text-gray-500">Supplier fee</div>{{ money(contract.booking_fee) }} {{ feePerOptions.find((o) => o.value === contract.booking_fee_per)?.label.toLowerCase() }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Agent commission (B2B)</div>{{ contract.commission_percent }}%</div>
                </div>
                <p v-if="contract.notes" class="mt-3 whitespace-pre-line text-sm text-gray-600">{{ contract.notes }}</p>
            </FullWidthBox>

            <FullWidthBox title="Early booking" class="mt-6">
                <template #actions>
                    <Button v-if="canEdit" size="sm" variant="primary" @click="openEditor('eb')">+ Add</Button>
                </template>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Code</th>
                                <th class="border border-gray-300 px-2 py-2">Reservation dates</th>
                                <th class="border border-gray-300 px-2 py-2">Stay dates</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Discount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Prepayment</th>
                                <th class="border border-gray-300 px-2 py-2">Payment by</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="contract.early_bookings.length === 0"><td colspan="8" class="border border-gray-300 px-2 py-3 text-center text-gray-400">No early booking.</td></tr>
                            <tr v-for="row in contract.early_bookings" :key="row.id" :class="row.active ? '' : 'text-gray-400'">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.code }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.booking_from }} – {{ row.booking_to }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.stay_from }} – {{ row.stay_to }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right">{{ pad2(row.discount_percent) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right">{{ pad2(row.prepayment_percent) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.payment_deadline ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center"><NiceCheckbox :model-value="row.active" :disabled="! canEdit" @update:model-value="toggleActive('eb', row)" /></td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="mr-2 text-xs text-red-600 hover:underline" @click="openEditor('eb', row)">Edit</button>
                                    <button type="button" class="text-xs text-gray-500 hover:underline" @click="toDelete = { kind: 'eb', row }">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Special offers (SPO)" class="mt-6">
                <template #actions>
                    <Button v-if="canEdit" size="sm" variant="primary" @click="openEditor('spo')">+ Add</Button>
                </template>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Offer</th>
                                <th class="border border-gray-300 px-2 py-2">What</th>
                                <th class="border border-gray-300 px-2 py-2">Reservation dates</th>
                                <th class="border border-gray-300 px-2 py-2">Stay dates</th>
                                <th class="border border-gray-300 px-2 py-2">Rooms</th>
                                <th class="border border-gray-300 px-2 py-2">Combines with</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="contract.special_offers.length === 0"><td colspan="8" class="border border-gray-300 px-2 py-3 text-center text-gray-400">No special offers.</td></tr>
                            <tr v-for="row in contract.special_offers" :key="row.id" :class="row.active ? '' : 'text-gray-400'">
                                <td class="border border-gray-300 px-2 py-2"><div class="font-medium">{{ row.name }}</div><div class="text-xs text-gray-500">{{ row.code }}</div></td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <template v-if="row.type === 'percent'">{{ row.discount_percent }}% off<span v-if="row.min_nights"> from {{ row.min_nights }} nights</span></template>
                                    <template v-else>{{ row.match_adults }}+{{ row.match_children }} charged as {{ row.charge_adults }}+{{ row.charge_children }}</template>
                                    <div v-if="row.on_request" class="text-xs font-medium text-amber-700">On request</div>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ window_(row.booking_from, row.booking_to) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <div v-for="(w, i) in row.stay_windows" :key="i">{{ w.from }} – {{ w.to }}</div>
                                    <span v-if="! row.stay_windows.length">Whole season</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-xs">{{ roomsLabel(row.room_codes) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-xs">
                                    {{ [row.combinable_with_eb ? 'Early booking' : null, row.combinable_with_offers ? 'Other offers' : null].filter(Boolean).join(', ') || 'Nothing' }}
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center"><NiceCheckbox :model-value="row.active" :disabled="! canEdit" @update:model-value="toggleActive('spo', row)" /></td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="mr-2 text-xs text-red-600 hover:underline" @click="openEditor('spo', row)">Edit</button>
                                    <button type="button" class="text-xs text-gray-500 hover:underline" @click="toDelete = { kind: 'spo', row }">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Markup rules" class="mt-6">
                <template #actions>
                    <Button v-if="canEdit" size="sm" variant="primary" @click="openEditor('markup')">+ Add</Button>
                </template>
                <p class="mb-2 text-xs text-gray-500">The active rule with the highest priority that matches channel, reservation date and check-in wins. Keep one rule without dates as the default.</p>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Code</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Priority</th>
                                <th class="border border-gray-300 px-2 py-2">Channel</th>
                                <th class="border border-gray-300 px-2 py-2">Reservation dates</th>
                                <th class="border border-gray-300 px-2 py-2">Check-in dates</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Markup</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="contract.markups.length === 0"><td colspan="8" class="border border-gray-300 px-2 py-3 text-center text-red-600">No markup rule: the search cannot price this contract.</td></tr>
                            <tr v-for="row in contract.markups" :key="row.id" :class="row.active ? '' : 'text-gray-400'">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.code }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ row.priority }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.channel ?? 'Both' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ window_(row.booking_from, row.booking_to) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ window_(row.checkin_from, row.checkin_to) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right">{{ row.markup_percent }}%</td>
                                <td class="border border-gray-300 px-2 py-2 text-center"><NiceCheckbox :model-value="row.active" :disabled="! canEdit" @update:model-value="toggleActive('markup', row)" /></td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="mr-2 text-xs text-red-600 hover:underline" @click="openEditor('markup', row)">Edit</button>
                                    <button type="button" class="text-xs text-gray-500 hover:underline" @click="toDelete = { kind: 'markup', row }">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Rooms and rates (per room, per night)" class="mt-6" default-collapsed>
                <div class="mb-3 overflow-x-auto">
                    <table class="border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr class="text-left uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-1">Period</th>
                                <th v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.code }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td class="border border-gray-300 px-2 py-1">Dates</td><td v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.from_label }} – {{ p.to_label }}</td></tr>
                            <tr><td class="border border-gray-300 px-2 py-1">Min stay / release (rooms)</td><td v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.min_stay.pure ?? '—' }} n / {{ p.release_days.pure ?? '—' }} d</td></tr>
                            <tr><td class="border border-gray-300 px-2 py-1">Min stay / release (villas)</td><td v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.min_stay.edition ?? '—' }} n / {{ p.release_days.edition ?? '—' }} d</td></tr>
                        </tbody>
                    </table>
                </div>
                <div v-for="room in contract.rooms" :key="room.code" class="border-b py-2 last:border-0">
                    <button type="button" class="text-sm font-medium text-gray-800 hover:text-red-600" @click="openRoom = openRoom === room.code ? null : room.code">
                        {{ openRoom === room.code ? '▾' : '▸' }} {{ room.name }} <span class="text-xs text-gray-500">({{ room.rates.length }} occupancies)</span>
                    </button>
                    <div v-if="openRoom === room.code" class="mt-2 overflow-x-auto">
                        <table class="border-collapse border border-gray-300 text-xs">
                            <thead>
                                <tr class="text-left uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-1">Occupancy</th>
                                    <th v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-right">{{ p.code }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(rate, i) in room.rates" :key="i">
                                    <td class="border border-gray-300 px-2 py-1">{{ rate.label }}</td>
                                    <td v-for="(price, k) in rate.per_night" :key="k" class="border border-gray-300 px-2 py-1 text-right">{{ price === null ? '—' : money(price) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </FullWidthBox>

            <div class="mt-4 text-sm">
                <RouterLink :to="routeUrl('hotelContracts.list')" class="text-red-600 hover:underline">← All contracts</RouterLink>
                <RouterLink :to="routeUrl('packages.search', { hotel_id: contract.hotel?.id })" class="ml-4 text-red-600 hover:underline">Search prices</RouterLink>
            </div>
        </template>

        <SideOverlay :show="Boolean(editor)" :title="editorTitle" @close="editor = null">
            <form v-if="editor" class="space-y-4" @submit.prevent="save">
                <template v-if="editor.kind === 'header'">
                    <AsyncSelect v-model="editor.form.hotel_id" :url="hotelsUrl" label-key="title" :initial-option="contract.hotel" label="Hotel *" :error="errors.hotel_id" />
                    <AsyncSelect v-model="editor.form.supplier_id" url="/suppliers/suppliers/autosuggest" :initial-option="contract.supplier" label="Supplier" :error="errors.supplier_id" />
                    <InputText v-model="editor.form.code" label="Code *" :error="errors.code" />
                    <InputText v-model="editor.form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="editor.form.board" label="Board" :error="errors.board" />
                    <div class="grid grid-cols-2 gap-3">
                        <DatePicker v-model="editor.form.valid_from" label="Valid from *" :error="errors.valid_from" />
                        <DatePicker v-model="editor.form.valid_to" label="Valid to *" :error="errors.valid_to" />
                        <InputNumber v-model="editor.form.infant_age_max" label="Infant up to age" :error="errors.infant_age_max" />
                        <InputNumber v-model="editor.form.child_age_max" label="Child up to age" :error="errors.child_age_max" />
                        <InputNumber v-model="editor.form.booking_fee" label="Supplier fee €" :error="errors.booking_fee" />
                        <Select v-model="editor.form.booking_fee_per" :options="feePerOptions" label="Fee" :placeholder="null" />
                        <InputNumber v-model="editor.form.commission_percent" label="Agent commission % (B2B)" :error="errors.commission_percent" />
                        <Select v-model="editor.form.rounding" :options="roundingOptions" label="Round selling price" :placeholder="null" />
                    </div>
                    <NiceCheckbox v-model="editor.form.infants_free" label="Infants free when the room has no infant rate" />
                    <NiceCheckbox v-model="editor.form.active" label="Active (used in the search)" />
                    <Textarea v-model="editor.form.notes" label="Notes" />
                </template>

                <template v-else-if="editor.kind === 'eb'">
                    <InputText v-model="editor.form.code" label="Code * (e.g. EB1)" :error="errors.code" />
                    <div class="grid grid-cols-2 gap-3">
                        <DatePicker v-model="editor.form.booking_from" label="Reservation from *" :error="errors.booking_from" />
                        <DatePicker v-model="editor.form.booking_to" label="Reservation to *" :error="errors.booking_to" />
                        <DatePicker v-model="editor.form.stay_from" label="Stay from *" :error="errors.stay_from" />
                        <DatePicker v-model="editor.form.stay_to" label="Stay to *" :error="errors.stay_to" />
                        <InputNumber v-model="editor.form.discount_percent" label="Discount % *" :error="errors.discount_percent" />
                        <InputNumber v-model="editor.form.prepayment_percent" label="Prepayment %" :error="errors.prepayment_percent" />
                        <DatePicker v-model="editor.form.payment_deadline" label="Payment deadline" :error="errors.payment_deadline" />
                    </div>
                    <NiceCheckbox v-model="editor.form.active" label="Active" />
                </template>

                <template v-else-if="editor.kind === 'spo'">
                    <InputText v-model="editor.form.name" label="Name * (e.g. Black Friday 10%)" :error="errors.name" />
                    <InputText v-model="editor.form.code" label="Code *" :error="errors.code" />
                    <Select v-model="editor.form.type" :options="typeOptions" label="Type *" :placeholder="null" :error="errors.type" />
                    <div v-if="editor.form.type === 'percent'" class="grid grid-cols-2 gap-3">
                        <InputNumber v-model="editor.form.discount_percent" label="Discount % *" :error="errors.discount_percent" />
                        <InputNumber v-model="editor.form.min_nights" label="From nights (e.g. 14)" :error="errors.min_nights" />
                    </div>
                    <div v-else>
                        <div class="grid grid-cols-4 gap-2">
                            <InputNumber v-model="editor.form.match_adults" label="Adults" :error="errors.match_adults" />
                            <InputNumber v-model="editor.form.match_children" label="Children" :error="errors.match_children" />
                            <InputNumber v-model="editor.form.charge_adults" label="Charged adults" :error="errors.charge_adults" />
                            <InputNumber v-model="editor.form.charge_children" label="Charged children" :error="errors.charge_children" />
                        </div>
                        <p class="mt-1 text-xs text-gray-500">E.g. 2 adults + 2 children charged as 2 adults + 0 children = 2 kids free.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <DatePicker v-model="editor.form.booking_from" label="Reservation from" :error="errors.booking_from" />
                        <DatePicker v-model="editor.form.booking_to" label="Reservation to" :error="errors.booking_to" />
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Stay dates (empty = whole season)</label>
                        <div v-for="(w, i) in editor.form.stay_windows" :key="i" class="mb-2 flex items-end gap-2">
                            <DatePicker v-model="w.from" :error="errors[`stay_windows.${i}.from`]" />
                            <DatePicker v-model="w.to" :error="errors[`stay_windows.${i}.to`]" />
                            <button type="button" class="pb-2 text-xs text-gray-500 hover:underline" @click="editor.form.stay_windows.splice(i, 1)">Remove</button>
                        </div>
                        <button type="button" class="text-xs text-red-600 hover:underline" @click="editor.form.stay_windows.push({ from: '', to: '' })">+ Add stay dates</button>
                    </div>
                    <CheckboxDropdown v-model="editor.form.room_codes" :options="roomOptions" label="Rooms (none = all rooms)" />
                    <NiceCheckbox v-model="editor.form.combinable_with_eb" label="Combines with early booking" />
                    <NiceCheckbox v-model="editor.form.combinable_with_offers" label="Combines with other special offers" />
                    <NiceCheckbox v-model="editor.form.on_request" label="On request (needs hotel approval)" />
                    <NiceCheckbox v-model="editor.form.active" label="Active" />
                    <Textarea v-model="editor.form.notes" label="Notes" />
                </template>

                <template v-else>
                    <div class="grid grid-cols-2 gap-3">
                        <InputText v-model="editor.form.code" label="Code *" :error="errors.code" />
                        <InputNumber v-model="editor.form.priority" label="Priority * (higher wins)" :error="errors.priority" />
                        <InputNumber v-model="editor.form.markup_percent" label="Markup % *" :error="errors.markup_percent" />
                        <Select v-model="editor.form.channel" :options="channelOptions" label="Channel" placeholder="Both" />
                        <DatePicker v-model="editor.form.booking_from" label="Reservation from" :error="errors.booking_from" />
                        <DatePicker v-model="editor.form.booking_to" label="Reservation to" :error="errors.booking_to" />
                        <DatePicker v-model="editor.form.checkin_from" label="Check-in from" :error="errors.checkin_from" />
                        <DatePicker v-model="editor.form.checkin_to" label="Check-in to" :error="errors.checkin_to" />
                    </div>
                    <CheckboxDropdown v-model="editor.form.room_codes" :options="roomOptions" label="Rooms (none = all rooms)" />
                    <NiceCheckbox v-model="editor.form.active" label="Active" />
                </template>

                <div class="flex gap-2 pt-2">
                    <Button type="submit" variant="primary" :disabled="saving">Save</Button>
                    <Button type="button" @click="editor = null">Cancel</Button>
                </div>
            </form>
        </SideOverlay>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete?"
            :message="toDelete ? `${toDelete.row.code} will be deleted. To pause it, switch it off instead.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
