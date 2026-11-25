<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { money } from '../../../helpers/money.js';
import { downloadFile } from '../../../helpers/download.js';
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
const hotelsUrl = '/hotels/autosuggest';

const contract = ref(null);
const openRoom = ref(null);

async function load() {
    contract.value = castResource((await api.get(`/hotel-contracts/${id}`)).data);
}
onMounted(load);

// ---------------------------------------------------------------- JSON import of SPO, early booking, stop sales
const jsonFile = ref(null);
const jsonInput = ref(null);
const jsonImporting = ref(false);
const jsonResult = ref(null); // { ok, message }
const downloadOffersExample = () => downloadFile('/hotel-contract-uploads/json-example/offers', { fallbackName: 'example-offers-stop-sales.json' });
async function importJson() {
    if (! jsonFile.value || jsonImporting.value) return;
    jsonImporting.value = true;
    jsonResult.value = null;
    const body = new FormData();
    body.append('file', jsonFile.value);
    try {
        const { data } = await api.post(`/hotel-contracts/${id}/import-json`, body);
        jsonResult.value = { ok: true, message: data.message };
        jsonFile.value = null;
        if (jsonInput.value) jsonInput.value.value = '';
        await load();
    } catch (error) {
        if (error.response?.status === 422) {
            const errs = error.response.data.errors;
            jsonResult.value = { ok: false, message: errs ? Object.values(errs).flat().join(' ') : error.response.data.message };
        } else {
            throw error;
        }
    } finally {
        jsonImporting.value = false;
    }
}

const canEdit = computed(() => Boolean(contract.value?.can_edit));
const roomName = (code) => contract.value?.room_options.find((r) => r.code === code)?.name ?? code;
const roomsLabel = (codes) => (codes?.length ? codes.map(roomName).join(', ') : 'All rooms');
const roomOptions = computed(() => (contract.value?.room_options ?? []).map((r) => ({ value: r.code, label: r.name })));
const window_ = (from, to) => (from || to ? `${from ?? '…'} – ${to ?? '…'}` : 'Any');

// ---------------------------------------------------------------- editor
const SECTIONS = {
    eb: { url: 'early-bookings', title: 'Early booking' },
    spo: { url: 'special-offers', title: 'Special offer' },
    markup: { url: 'markups', title: 'Markup' },
};
const editor = ref(null); // { kind, id, form }
const errors = ref({});
const saving = ref(false);

function blank(kind) {
    if (kind === 'eb') return { code: '', booking_from: '', booking_to: '', stay_from: '', stay_to: '', discount_percent: null, prepayment_percent: null, payment_deadline: '', active: true };
    if (kind === 'spo') return { code: '', name: '', type: 'percent', discount_percent: null, booking_from: '', booking_to: '', stay_windows: [], room_codes: [], min_nights: null, combinable_with_eb: true, combinable_with_offers: true, match_adults: 2, match_children: 2, charge_adults: 2, charge_children: 0, on_request: false, active: true, notes: '' };
    return { calc_type: 'percent', amount: null, room_codes: [], active: true };
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
            taxes: JSON.parse(JSON.stringify(c.taxes ?? [])),
            short_stay_supplements: JSON.parse(JSON.stringify(c.short_stay_supplements ?? [])),
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
            const base = `/hotel-contracts/${id}/${kind === 'stop' ? 'stop-sales' : SECTIONS[kind].url}`;
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
        const url = toDelete.value.kind === 'stop' ? 'stop-sales' : SECTIONS[toDelete.value.kind].url;
        await api.delete(`/hotel-contracts/${id}/${url}/${toDelete.value.row.id}`);
        toDelete.value = null;
        await load();
    } finally {
        deleting.value = false;
    }
}

const editorTitle = computed(() => {
    if (! editor.value) return '';
    if (editor.value.kind === 'header') return 'Edit contract';
    if (editor.value.kind === 'stop') return 'New stop sale';
    return `${editor.value.id ? 'Edit' : 'New'} ${SECTIONS[editor.value.kind].title.toLowerCase()}`;
});
const typeOptions = computed(() => (contract.value?.special_offer_types ?? []).map((t) => ({ value: t.id, label: t.name })));
const channelOptions = [{ value: 'B2C', label: 'B2C' }, { value: 'B2B', label: 'B2B' }];
const calcOptions = [{ value: 'percent', label: '%' }, { value: 'amount', label: 'EUR' }];
const roomNames = (codes) => (codes?.length ? codes.map((c) => roomOptions.value.find((o) => o.value === c)?.label ?? c).join(', ') : 'All rooms');
const markupText = (row) => (row.calc_type === 'amount' ? `${row.amount} EUR` : `${row.amount}%`);
const markupLimits = (row) => [row.channel, row.booking_from || row.booking_to ? `reservation ${window_(row.booking_from, row.booking_to)}` : null, row.checkin_from || row.checkin_to ? `check-in ${window_(row.checkin_from, row.checkin_to)}` : null].filter(Boolean).join(', ');
const feePerOptions = [{ value: 'booking', label: 'Per booking' }, { value: 'pax', label: 'Per person' }, { value: 'night', label: 'Per night' }];
const roundingOptions = [{ value: 'nearest_1', label: 'Nearest 1 €' }, { value: 'nearest_5', label: 'Nearest 5 €' }, { value: 'none', label: 'Cents' }];
const pad2 = (v) => (v === null || v === undefined ? '—' : `${v}%`);

// contract currency (e.g. USD for the Maldives)
function cur(value) {
    const c = contract.value?.currency ?? 'EUR';
    if (c === 'EUR') return money(value);
    return `${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${c}`;
}
const blocks = computed(() => [...new Set((contract.value?.periods ?? []).flatMap((p) => [...Object.keys(p.min_stay ?? {}), ...Object.keys(p.release_days ?? {})]))]);
const isUnit = (room) => Array.isArray(room.unit_rates);
const occupancyText = (room) => (room.max_occupancy ?? []).map((o) => `${o.adults}A${o.children ? ` + ${o.children}C` : ''}`).join(' or ') || '—';
const taxText = (t) => `${t.name}: ${cur(t.amount)} per person${t.per === 'night' ? ' per night' : ' per stay'}${Number(t.min_age) > 0 ? ` from age ${t.min_age}` : ''}`;
const perOptions = [{ value: 'night', label: 'Per night' }, { value: 'stay', label: 'Per stay' }];

// ---------------------------------------------------------------- draft / live
const statusSaving = ref(false);
const statusError = ref('');
async function setStatus(status) {
    statusSaving.value = true;
    statusError.value = '';
    try {
        await api.put(`/hotel-contracts/${id}/status`, { status });
        await load();
    } catch (error) {
        if (error.response?.status === 422) statusError.value = error.response.data.message;
        else throw error;
    } finally {
        statusSaving.value = false;
    }
}

// ---------------------------------------------------------------- rate grid editing
const rateEdit = ref(null); // { periods, rooms } copy being edited
const rateErrors = ref('');
const rateSaving = ref(false);
const occText = (room) => (room.max_occupancy ?? []).map((o) => `${o.adults}+${o.children}`).join(', ');
function startRateEdit() {
    const c = JSON.parse(JSON.stringify({ periods: contract.value.periods, rooms: contract.value.rooms }));
    c.periods.forEach((p) => { p.min_stay = { ...(Array.isArray(p.min_stay) ? {} : p.min_stay) }; p.release_days = { ...(Array.isArray(p.release_days) ? {} : p.release_days) }; });
    c.rooms.forEach((r) => {
        if (isUnit(r)) {
            const n = c.periods.length;
            r.extra_adult = Array.isArray(r.extra_adult) ? r.extra_adult : Array(n).fill(r.extra_adult ?? 0);
            r.extra_child = Array.isArray(r.extra_child) ? r.extra_child : Array(n).fill(r.extra_child ?? 0);
            r.occ_text = occText(r);
        }
    });
    rateErrors.value = '';
    rateEdit.value = c;
}
async function saveRates() {
    if (rateSaving.value) return;
    rateSaving.value = true;
    rateErrors.value = '';
    try {
        const rooms = rateEdit.value.rooms.map((r) => {
            const out = { ...r };
            if (isUnit(r)) {
                out.max_occupancy = (r.occ_text || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
                    const [a, ch] = x.split('+').map((v) => parseInt(v, 10) || 0);
                    return { adults: a, children: ch ?? 0 };
                });
                delete out.occ_text;
            }
            return out;
        });
        await api.put(`/hotel-contracts/${id}/rates`, { periods: rateEdit.value.periods, rooms });
        rateEdit.value = null;
        await load();
    } catch (error) {
        if (error.response?.status === 422) rateErrors.value = Object.values(error.response.data.errors ?? {})[0]?.[0] ?? error.response.data.message;
        else throw error;
    } finally {
        rateSaving.value = false;
    }
}

// ---------------------------------------------------------------- stop sales
const statusLabel = { sold_out: 'Sold out', on_request: 'On request' };
const statusOptions = [{ value: 'sold_out', label: 'Sold out (cannot be sold)' }, { value: 'on_request', label: 'On request' }];
const stopSaleRoomOptions = computed(() => [{ value: '', label: 'All rooms' }, ...roomOptions.value]);
const showPastStopSales = ref(false);
const todayIso = new Date().toISOString().slice(0, 10);
const toIso = (dmy) => (dmy ? dmy.split('.').reverse().join('-') : '');
const visibleStopSales = computed(() => (contract.value?.stop_sales ?? []).filter((s) => showPastStopSales.value || toIso(s.date_to) >= todayIso));

function openStopSale() {
    errors.value = {};
    editor.value = { kind: 'stop', id: null, form: { room_code: '', date_from: '', date_to: '', status: 'sold_out', notes: '' } };
}
</script>

<template>
    <AppLayout :title="contract ? `${contract.code}` : 'Hotel Contract'" fluid>
        <Loader v-if="! contract" />
        <template v-else>
            <FullWidthBox :title="`${contract.name} (${contract.code})`" :collapsible="false">
                <template #actions>
                    <span v-if="statusError" class="mr-2 text-xs text-red-600">{{ statusError }}</span>
                    <Button v-if="canEdit && contract.status === 'draft'" size="sm" variant="primary" class="mr-2" :disabled="statusSaving" @click="setStatus('live')">Switch to live</Button>
                    <Button v-if="canEdit && contract.status === 'live'" size="sm" class="mr-2" :disabled="statusSaving" @click="setStatus('draft')">Back to draft</Button>
                    <Button v-if="canEdit" size="sm" @click="openHeader">Edit</Button>
                </template>
                <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                    <div><div class="text-xs uppercase text-gray-500">Hotel</div>{{ contract.hotel?.title ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Supplier</div>{{ contract.supplier?.name ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Valid</div>{{ contract.valid_from }} – {{ contract.valid_to }}</div>
                    <div>
                        <div class="text-xs uppercase text-gray-500">Status</div>
                        <span :class="contract.status === 'live' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'" class="rounded px-2 py-0.5 text-xs font-medium">{{ contract.status === 'live' ? 'Live: all agents' : 'Draft: only testers see it' }}</span>
                        <span v-if="! contract.active" class="ml-1 text-xs text-gray-500">(switched off)</span>
                    </div>
                    <div><div class="text-xs uppercase text-gray-500">Board</div>{{ contract.board ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Ages</div>Infant 0-{{ contract.infant_age_max }}, child to {{ contract.child_age_max }}<span v-if="contract.infants_free">, infants free</span></div>
                    <div><div class="text-xs uppercase text-gray-500">Supplier fee</div>{{ cur(contract.booking_fee) }} {{ feePerOptions.find((o) => o.value === contract.booking_fee_per)?.label.toLowerCase() }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Agent commission (B2B)</div>{{ contract.commission_percent }}%</div>
                    <div><div class="text-xs uppercase text-gray-500">Currency</div>{{ contract.currency }}<span v-if="contract.currency !== 'EUR'" class="text-xs text-gray-500"> (shown in EUR in the search, ECB daily rate)</span></div>
                    <div>
                        <div class="text-xs uppercase text-gray-500">Taxes (at cost, after markup)</div>
                        <div v-for="(t, i) in contract.taxes" :key="i">{{ taxText(t) }}</div>
                        <span v-if="! contract.taxes.length">—</span>
                    </div>
                    <div>
                        <div class="text-xs uppercase text-gray-500">Short stay supplement</div>
                        <div v-for="(s, i) in contract.short_stay_supplements" :key="i">{{ s.nights }} nights: {{ cur(s.amount) }} per room per night</div>
                        <span v-if="! contract.short_stay_supplements.length">—</span>
                    </div>
                </div>
                <p v-if="contract.notes" class="mt-3 whitespace-pre-line text-sm text-gray-600">{{ contract.notes }}</p>
            </FullWidthBox>

            <FullWidthBox v-if="canEdit" title="Import special offers and stop sales (JSON)" class="mt-6" :default-collapsed="true">
                <p class="mb-2 text-xs text-gray-500">
                    A JSON with "spo", "early_booking" and / or "stop_sales" lists
                    (<button type="button" class="text-red-600 hover:underline" @click="downloadOffersExample">example</button>).
                    An offer or early booking with an existing code is updated, the same stop sale twice is skipped. If one row is wrong nothing is imported.
                    Room codes of this contract: <span class="font-mono">{{ (contract.room_options ?? []).map((r) => r.code).join(', ') }}</span>
                </p>
                <div class="flex flex-wrap items-center gap-3">
                    <input ref="jsonInput" type="file" accept=".json,.txt,application/json" class="text-sm" @change="jsonFile = $event.target.files[0] ?? null">
                    <Button size="sm" variant="primary" :disabled="! jsonFile || jsonImporting" @click="importJson">{{ jsonImporting ? 'Importing…' : 'Import' }}</Button>
                    <span v-if="jsonResult" class="text-sm" :class="jsonResult.ok ? 'text-green-700' : 'text-red-600'">{{ jsonResult.message }}</span>
                </div>
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

            <FullWidthBox title="Markup" class="mt-6">
                <template #actions>
                    <Button v-if="canEdit" size="sm" variant="primary" @click="openEditor('markup')">+ Add</Button>
                </template>
                <p class="mb-2 text-xs text-gray-500">
                    % or EUR (per room for the whole stay), for all rooms or chosen rooms. A rule for chosen rooms wins over one for all rooms.
                    Without a contract markup, the markup of the destination for this hotel type ({{ contract.hotel?.hotel_type }}) and B2C / B2B is used.
                    <RouterLink v-if="contract.hotel?.parent_destination_id" :to="{ name: 'parentDestinations.edit', params: { id: contract.hotel.parent_destination_id } }" class="text-red-600 hover:underline">Destination markups</RouterLink>
                </p>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Rooms</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Markup</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="contract.markups.length === 0"><td colspan="4" class="border border-gray-300 px-2 py-3 text-center text-gray-500">No contract markup: the destination markup is used.</td></tr>
                            <tr v-for="row in contract.markups" :key="row.id" :class="row.active ? '' : 'text-gray-400'">
                                <td class="border border-gray-300 px-2 py-2">{{ roomNames(row.room_codes) }}<div v-if="markupLimits(row)" class="text-xs text-gray-500">Only {{ markupLimits(row) }} (imported)</div></td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ markupText(row) }}</td>
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

            <FullWidthBox title="Stop sales and on request dates" class="mt-6">
                <template #actions>
                    <RouterLink :to="routeUrl('hotelAvailability.list')" class="mr-3 text-xs text-red-600 hover:underline">Upload availability chart</RouterLink>
                    <Button v-if="canEdit" size="sm" variant="primary" @click="openStopSale">+ Add</Button>
                </template>
                <label class="mb-2 flex items-center gap-2 text-xs text-gray-600"><input v-model="showPastStopSales" type="checkbox"> Show past dates</label>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Room</th>
                                <th class="border border-gray-300 px-2 py-2">Dates</th>
                                <th class="border border-gray-300 px-2 py-2">Status</th>
                                <th class="border border-gray-300 px-2 py-2">Source</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="visibleStopSales.length === 0"><td colspan="5" class="border border-gray-300 px-2 py-3 text-center text-gray-400">No stop sales.</td></tr>
                            <tr v-for="row in visibleStopSales" :key="row.id">
                                <td class="border border-gray-300 px-2 py-2">{{ row.room_code ? roomName(row.room_code) : 'All rooms' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.date_from === row.date_to ? row.date_from : `${row.date_from} – ${row.date_to}` }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span :class="row.status === 'sold_out' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'" class="rounded px-2 py-0.5 text-xs">{{ statusLabel[row.status] }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-xs text-gray-600">
                                    <RouterLink v-if="row.upload_id" :to="routeUrl('hotelAvailability.show', row.upload_id)" class="text-red-600 hover:underline">Availability chart</RouterLink>
                                    <span v-else>Manual{{ row.notes ? `: ${row.notes}` : '' }}</span>
                                </td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="text-xs text-gray-500 hover:underline" @click="toDelete = { kind: 'stop', row: { ...row, code: `${row.room_code ? roomName(row.room_code) : 'All rooms'} ${row.date_from}` } }">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox :title="`Rooms and rates (per room, per night, ${contract.currency})`" class="mt-6" :default-collapsed="contract.status === 'live'">
                <template #actions>
                    <Button v-if="canEdit && ! rateEdit" size="sm" @click="startRateEdit">Edit rates</Button>
                </template>
                <template v-if="rateEdit">
                    <p class="mb-3 text-xs text-gray-600">Correct dates, min stay / release, prices, villa extras, max occupancy (e.g. "3+0, 2+1" = 3 adults or 2 adults + 1 child) and on request. Rooms and occupancy rows cannot be added here.</p>
                    <div class="mb-4 overflow-x-auto">
                        <table class="border-collapse border border-gray-300 text-xs">
                            <thead>
                                <tr class="text-left uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-1">Period</th>
                                    <th v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.code }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-1">From</td>
                                    <td v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 p-1"><input v-model="p.from" type="date" class="w-32 rounded border-gray-300 px-1 py-0.5 text-xs"></td>
                                </tr>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-1">To</td>
                                    <td v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 p-1"><input v-model="p.to" type="date" class="w-32 rounded border-gray-300 px-1 py-0.5 text-xs"></td>
                                </tr>
                                <template v-for="block in blocks" :key="block">
                                    <tr>
                                        <td class="border border-gray-300 px-2 py-1">Min stay ({{ block }})</td>
                                        <td v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 p-1"><input v-model.number="p.min_stay[block]" type="number" min="0" class="w-16 rounded border-gray-300 px-1 py-0.5 text-xs"></td>
                                    </tr>
                                    <tr>
                                        <td class="border border-gray-300 px-2 py-1">Release days ({{ block }})</td>
                                        <td v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 p-1"><input v-model.number="p.release_days[block]" type="number" min="0" class="w-16 rounded border-gray-300 px-1 py-0.5 text-xs"></td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                    <div v-for="room in rateEdit.rooms" :key="room.code" class="mb-4 border-b pb-3">
                        <div class="mb-2 flex flex-wrap items-center gap-3 text-xs">
                            <input v-model="room.name" type="text" class="w-72 rounded border-gray-300 px-2 py-1 text-sm font-medium">
                            <label class="flex items-center gap-1"><input v-model="room.on_request" type="checkbox"> On request</label>
                            <template v-if="isUnit(room)">
                                <label class="flex items-center gap-1">Room price covers <input v-model.number="room.base_pax" type="number" min="1" class="w-14 rounded border-gray-300 px-1 py-0.5 text-xs"> persons</label>
                                <label class="flex items-center gap-1">Max occupancy <input v-model="room.occ_text" type="text" class="w-32 rounded border-gray-300 px-1 py-0.5 text-xs"></label>
                            </template>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="border-collapse border border-gray-300 text-xs">
                                <thead>
                                    <tr class="text-left uppercase text-gray-500">
                                        <th class="border border-gray-300 px-2 py-1">{{ isUnit(room) ? 'Per night' : 'Occupancy' }}</th>
                                        <th v-for="p in rateEdit.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-right">{{ p.code }}</th>
                                    </tr>
                                </thead>
                                <tbody v-if="isUnit(room)">
                                    <tr v-for="row in [['unit_rates', 'Room price'], ['extra_adult', 'Extra adult'], ['extra_child', 'Extra child']]" :key="row[0]">
                                        <td class="border border-gray-300 px-2 py-1">{{ row[1] }}</td>
                                        <td v-for="(p, k) in rateEdit.periods" :key="k" class="border border-gray-300 p-1"><input v-model.number="room[row[0]][k]" type="number" step="0.01" class="w-24 rounded border-gray-300 px-1 py-0.5 text-right text-xs"></td>
                                    </tr>
                                </tbody>
                                <tbody v-else>
                                    <tr v-for="(rate, i) in room.rates" :key="i">
                                        <td class="border border-gray-300 px-2 py-1">{{ rate.label }}</td>
                                        <td v-for="(p, k) in rateEdit.periods" :key="k" class="border border-gray-300 p-1"><input v-model.number="rate.per_night[k]" type="number" step="0.01" class="w-24 rounded border-gray-300 px-1 py-0.5 text-right text-xs"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <Button variant="primary" :disabled="rateSaving" @click="saveRates">Save rates</Button>
                        <Button @click="rateEdit = null">Cancel</Button>
                        <span v-if="rateErrors" class="text-sm text-red-600">{{ rateErrors }}</span>
                    </div>
                </template>
                <template v-else>
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
                            <tr v-for="block in blocks" :key="block">
                                <td class="border border-gray-300 px-2 py-1">Min stay / release ({{ block }})</td>
                                <td v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-center">{{ p.min_stay?.[block] ?? '—' }} n / {{ p.release_days?.[block] ?? '—' }} d</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-for="room in contract.rooms" :key="room.code" class="border-b py-2 last:border-0">
                    <button type="button" class="text-sm font-medium text-gray-800 hover:text-red-600" @click="openRoom = openRoom === room.code ? null : room.code">
                        {{ openRoom === room.code ? '▾' : '▸' }} {{ room.name }}
                        <span v-if="isUnit(room)" class="text-xs text-gray-500">(per room for {{ room.base_pax }}, max {{ occupancyText(room) }})</span>
                        <span v-else class="text-xs text-gray-500">({{ room.rates.length }} occupancies)</span>
                        <span v-if="room.on_request" class="ml-1 rounded bg-yellow-100 px-1.5 text-xs text-yellow-800">on request</span>
                    </button>
                    <div v-if="openRoom === room.code && isUnit(room)" class="mt-2 overflow-x-auto">
                        <table class="border-collapse border border-gray-300 text-xs">
                            <thead>
                                <tr class="text-left uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-1">Per night</th>
                                    <th v-for="p in contract.periods" :key="p.code" class="border border-gray-300 px-2 py-1 text-right">{{ p.code }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-1">Room for 1-{{ room.base_pax }} persons</td>
                                    <td v-for="(price, k) in room.unit_rates" :key="k" class="border border-gray-300 px-2 py-1 text-right">{{ price === null ? '—' : cur(price) }}</td>
                                </tr>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-1">Extra adult</td>
                                    <td v-for="(p, k) in contract.periods" :key="k" class="border border-gray-300 px-2 py-1 text-right">{{ cur(Array.isArray(room.extra_adult) ? room.extra_adult[k] : room.extra_adult) }}</td>
                                </tr>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-1">Extra child</td>
                                    <td v-for="(p, k) in contract.periods" :key="k" class="border border-gray-300 px-2 py-1 text-right">{{ cur(Array.isArray(room.extra_child) ? room.extra_child[k] : room.extra_child) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else-if="openRoom === room.code" class="mt-2 overflow-x-auto">
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
                                    <td v-for="(price, k) in rate.per_night" :key="k" class="border border-gray-300 px-2 py-1 text-right">{{ price === null ? '—' : cur(price) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                </template>
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
                        <InputNumber v-model="editor.form.booking_fee" :label="`Supplier fee (${contract.currency})`" :error="errors.booking_fee" />
                        <Select v-model="editor.form.booking_fee_per" :options="feePerOptions" label="Fee" :placeholder="null" />
                        <InputNumber v-model="editor.form.commission_percent" label="Agent commission % (B2B)" :error="errors.commission_percent" />
                        <Select v-model="editor.form.rounding" :options="roundingOptions" label="Round selling price" :placeholder="null" />
                    </div>
                    <div>
                        <div class="mb-1 text-sm font-medium text-gray-700">Taxes per person (added at cost after markup, never discounted)</div>
                        <div v-for="(t, i) in editor.form.taxes" :key="i" class="mb-2 rounded border border-gray-200 p-2">
                            <div class="grid grid-cols-2 gap-2">
                                <InputText v-model="t.name" label="Name" :error="errors[`taxes.${i}.name`]" />
                                <InputNumber v-model="t.amount" :label="`Amount (${contract.currency})`" :error="errors[`taxes.${i}.amount`]" />
                                <Select v-model="t.per" :options="perOptions" label="Charged" :placeholder="null" />
                                <InputNumber v-model="t.min_age" label="From age" />
                            </div>
                            <button type="button" class="mt-1 text-xs text-gray-500 hover:text-red-600" @click="editor.form.taxes.splice(i, 1)">Remove</button>
                        </div>
                        <button type="button" class="text-xs text-red-600 hover:underline" @click="editor.form.taxes.push({ name: 'Green Tax', amount: null, per: 'night', min_age: 2 })">+ Add tax</button>
                    </div>
                    <div>
                        <div class="mb-1 text-sm font-medium text-gray-700">Short stay supplement (per room per night, only for exactly that many nights, not discounted)</div>
                        <div v-for="(s, i) in editor.form.short_stay_supplements" :key="i" class="mb-2 grid grid-cols-12 items-end gap-2">
                            <div class="col-span-4"><InputNumber v-model="s.nights" label="Nights" :error="errors[`short_stay_supplements.${i}.nights`]" /></div>
                            <div class="col-span-6"><InputNumber v-model="s.amount" :label="`Amount (${contract.currency})`" :error="errors[`short_stay_supplements.${i}.amount`]" /></div>
                            <button type="button" class="col-span-2 pb-2 text-xs text-gray-500 hover:text-red-600" @click="editor.form.short_stay_supplements.splice(i, 1)">✕</button>
                        </div>
                        <button type="button" class="text-xs text-red-600 hover:underline" @click="editor.form.short_stay_supplements.push({ nights: 3, amount: null })">+ Add supplement</button>
                    </div>
                    <NiceCheckbox v-model="editor.form.infants_free" label="Infants free when the room has no infant rate" />
                    <NiceCheckbox v-model="editor.form.active" label="Active (used in the search)" />
                    <Textarea v-model="editor.form.notes" label="Notes" />
                </template>

                <template v-else-if="editor.kind === 'stop'">
                    <Select v-model="editor.form.room_code" :options="stopSaleRoomOptions" label="Room" :placeholder="null" :error="errors.room_code" />
                    <div class="grid grid-cols-2 gap-3">
                        <DatePicker v-model="editor.form.date_from" label="From *" :error="errors.date_from" />
                        <DatePicker v-model="editor.form.date_to" label="To *" :error="errors.date_to" />
                    </div>
                    <Select v-model="editor.form.status" :options="statusOptions" label="Status *" :placeholder="null" :error="errors.status" />
                    <InputText v-model="editor.form.notes" label="Note" :error="errors.notes" />
                    <p class="text-xs text-gray-500">Stop sales added here are kept when a newer availability chart is applied.</p>
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
                        <Select v-model="editor.form.calc_type" :options="calcOptions" :placeholder="null" label="Calculation type *" :error="errors.calc_type" />
                        <InputNumber v-model="editor.form.amount" :label="editor.form.calc_type === 'amount' ? 'Amount (EUR per room) *' : 'Amount (%) *'" :error="errors.amount" />
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
            :message="toDelete ? `${toDelete.row.code ?? 'This row'} will be deleted. To pause it, switch it off instead.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
