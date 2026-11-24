<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../helpers/api.js';
import { castResource } from '../../types/responses.js';
import { todayApiDate } from '../../helpers/date.js';
import { money } from '../../helpers/money.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Loader from '../../components/Loader.vue';
import SearchSelect from '../../components/Form/SearchSelect.vue';
import Select from '../../components/Form/Select.vue';
import DatePicker from '../../components/Form/DatePicker.vue';
import InputNumber from '../../components/Form/InputNumber.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';

const route = useRoute();
const options = ref({ parent_destinations: [], hotels: [], charters: [], transfers: [], can_view_net: false });
const form = reactive({
    parent_destination_id: null,
    hotel_id: null,
    check_in: '',
    nights: 7,
    adults: 2,
    child_ages: [],
    booking_date: todayApiDate(),
    channel: 'B2C',
    charter: 'auto',
    transfer: 'auto',
});
const result = ref(null);
const loading = ref(false);
const errors = ref({});
const openNights = ref({});
const showUnavailable = ref({});

onMounted(async () => {
    options.value = castResource((await api.get('/package-prices/options')).data);
    const hotel = options.value.hotels.find((h) => String(h.id) === String(route.query.hotel_id ?? ''));
    if (hotel) {
        form.parent_destination_id = hotel.parent_destination_id;
        form.hotel_id = hotel.id;
    } else if (options.value.parent_destinations.length === 1) {
        form.parent_destination_id = options.value.parent_destinations[0].id;
    }
});

const destinationOptions = computed(() => options.value.parent_destinations.map((d) => ({ value: d.id, label: d.name })));
const hotelOptions = computed(() => options.value.hotels
    .filter((h) => ! form.parent_destination_id || h.parent_destination_id === form.parent_destination_id)
    .map((h) => ({ value: h.id, label: h.title })));
const charterOptions = computed(() => [
    { value: 'auto', label: 'Charter if it flies those days' },
    { value: 'none', label: 'Land only (no charter)' },
    ...options.value.charters
        .filter((c) => ! form.parent_destination_id || c.to_parent_destination_id === form.parent_destination_id)
        .map((c) => ({ value: String(c.id), label: c.name })),
]);
const transferOptions = computed(() => [
    { value: 'auto', label: 'Transfer of the destination' },
    { value: 'none', label: 'No transfer' },
    ...options.value.transfers
        .filter((t) => ! form.parent_destination_id || t.parent_destination_id === form.parent_destination_id)
        .map((t) => ({ value: String(t.id), label: t.name })),
]);
const channelOptions = [{ value: 'B2C', label: 'B2C (client)' }, { value: 'B2B', label: 'B2B (agency, with commission)' }];

watch(() => form.parent_destination_id, () => {
    if (form.hotel_id && ! hotelOptions.value.some((h) => h.value === form.hotel_id)) {
        form.hotel_id = null;
    }
});

const childrenCount = computed({
    get: () => form.child_ages.length,
    set: (count) => {
        const n = Math.max(0, Math.min(6, Number(count) || 0));
        while (form.child_ages.length < n) form.child_ages.push(null);
        form.child_ages.splice(n);
    },
});

const checkOut = computed(() => {
    const [d, m, y] = (form.check_in || '').split('.').map(Number);
    if (! d || ! m || ! y || ! form.nights) return '';
    const date = new Date(Date.UTC(y, m - 1, d + Number(form.nights)));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
});

async function search() {
    if (loading.value) return;
    loading.value = true;
    errors.value = {};
    openNights.value = {};
    try {
        const params = { ...form, child_ages: form.child_ages.map((a) => a ?? 0) };
        if (! params.hotel_id) delete params.hotel_id;
        if (! params.parent_destination_id) delete params.parent_destination_id;
        result.value = castResource((await api.get('/package-prices', { params })).data);
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(Object.entries(error.response.data.errors ?? {}).map(([k, v]) => [k, v[0]]));
            result.value = null;
        } else {
            throw error;
        }
    } finally {
        loading.value = false;
    }
}

const availableRooms = (hotel) => hotel.rooms.filter((r) => r.available);
const unavailableRooms = (hotel) => hotel.rooms.filter((r) => ! r.available);
const pct = (v) => `${Math.round(v * 10000) / 100}%`;
const paxLabel = (pax) => [
    `${pax.adults} adult${pax.adults === 1 ? '' : 's'}`,
    pax.children ? `${pax.children} child${pax.children === 1 ? '' : 'ren'}` : null,
    pax.infants ? `${pax.infants} infant${pax.infants === 1 ? '' : 's'}` : null,
].filter(Boolean).join(', ');
const roomKey = (hotel, room) => `${hotel.contract.id}-${room.room_code}`;
const toggleNights = (key) => { openNights.value = { ...openNights.value, [key]: ! openNights.value[key] }; };
const nightDiscounts = (night) => [night.eb ? `${night.eb.code} ${pct(night.eb.pct)}` : null, ...night.spo.map((s) => `${s.code} ${pct(s.pct)}`)].filter(Boolean).join(' + ') || '—';
// nightly rates stay in the contract currency (e.g. USD); totals are in EUR
const inContract = (hotel, v) => (hotel.contract_currency && hotel.contract_currency !== 'EUR' ? `${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${hotel.contract_currency}` : money(v));
const showNet = computed(() => Boolean(result.value?.can_view_net));
const isB2B = computed(() => result.value?.channel === 'B2B');
const colCount = computed(() => 5 + (isB2B.value ? 1 : 0) + (showNet.value ? 4 : 0));
</script>

<template>
    <AppLayout title="Package Search" fluid>
        <FullWidthBox title="Package search" :collapsible="false">
            <form class="space-y-4" @submit.prevent="search">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <SearchSelect v-model="form.parent_destination_id" :options="destinationOptions" label="Destination" placeholder="Choose destination…" :error="errors.parent_destination_id" />
                    <SearchSelect v-model="form.hotel_id" :options="hotelOptions" label="Hotel (optional)" placeholder="All hotels" :error="errors.hotel_id" />
                    <DatePicker v-model="form.check_in" label="Check-in *" :error="errors.check_in" />
                    <div>
                        <InputNumber v-model="form.nights" label="Nights *" min="1" :error="errors.nights" />
                        <p v-if="checkOut" class="mt-1 text-xs text-gray-500">Check-out {{ checkOut }}</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <InputNumber v-model="form.adults" label="Adults *" min="1" :error="errors.adults" />
                    <InputNumber v-model="childrenCount" label="Children" min="0" />
                    <div class="md:col-span-2">
                        <label v-if="form.child_ages.length" class="mb-1 block text-sm font-medium text-gray-700">Children ages at travel (infant 0-1.99, child 2-11.99)</label>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="(age, i) in form.child_ages" :key="i" class="w-24">
                                <InputNumber v-model="form.child_ages[i]" :placeholder="`Child ${i + 1}`" :error="errors[`child_ages.${i}`]" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <DatePicker v-model="form.booking_date" label="Reservation date" :error="errors.booking_date" />
                    <Select v-model="form.channel" :options="channelOptions" label="Channel" :placeholder="null" />
                    <Select v-model="form.charter" :options="charterOptions" label="Charter" :placeholder="null" />
                    <Select v-model="form.transfer" :options="transferOptions" label="Transfer" :placeholder="null" />
                </div>
                <div class="flex items-center gap-3">
                    <Button type="submit" variant="primary" :disabled="loading">Search prices</Button>
                    <span class="text-xs text-gray-500">Early booking and special offers are picked by the reservation date.</span>
                </div>
            </form>
        </FullWidthBox>

        <div v-if="loading" class="mt-6"><Loader /></div>

        <template v-else-if="result">
            <div v-if="result.hotels.length === 0" class="mt-6 rounded border border-gray-200 bg-white px-4 py-6 text-center text-gray-500">
                No active hotel contract covers {{ result.check_in }} for this destination.
            </div>

            <FullWidthBox
                v-for="hotel in result.hotels"
                :key="hotel.contract.id"
                class="mt-6"
                :title="`${hotel.hotel.title} ${'★'.repeat(hotel.hotel.stars || 0)}`"
                :collapsible="false"
            >
                <div class="mb-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                    <div>
                        <div class="text-xs uppercase text-gray-500">Stay</div>
                        <div>{{ result.check_in }} – {{ result.check_out }} · {{ result.nights }} nights · {{ hotel.pax ? paxLabel(hotel.pax) : '' }}</div>
                        <div class="text-gray-500">{{ hotel.contract.board }}<span v-if="hotel.contract.supplier"> · via {{ hotel.contract.supplier }}</span></div>
                    </div>
                    <div>
                        <div class="text-xs uppercase text-gray-500">Charter</div>
                        <div v-if="hotel.charter">
                            {{ hotel.charter.name }} ({{ hotel.charter.from_name }})
                            <div class="text-gray-500">Adult {{ money(hotel.charter.price_adult) }} · Child {{ money(hotel.charter.price_child) }} · Infant {{ money(hotel.charter.price_infant) }}<span v-if="hotel.charter.baggage_kg"> · {{ hotel.charter.baggage_kg }} kg</span></div>
                        </div>
                        <div v-else class="text-amber-700">{{ hotel.charter_note }}</div>
                    </div>
                    <div>
                        <div class="text-xs uppercase text-gray-500">Transfer</div>
                        <div v-if="hotel.transfer">
                            {{ hotel.transfer.name }}
                            <div class="text-gray-500">{{ money(hotel.transfer.band.price) }} for {{ hotel.transfer.band.min_pax }}-{{ hotel.transfer.band.max_pax }} persons</div>
                        </div>
                        <div v-else class="text-amber-700">{{ hotel.transfer_note }}</div>
                    </div>
                </div>

                <div v-if="hotel.exchange_rate" class="mb-3 text-xs text-gray-500">
                    Contract in {{ hotel.exchange_rate.currency }}, prices in EUR: 1 EUR = {{ hotel.exchange_rate.rate }} {{ hotel.exchange_rate.currency }} (ECB {{ hotel.exchange_rate.date }}). Charter and transfer are in EUR.
                </div>

                <div v-if="hotel.error" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ hotel.error }}</div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Room</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Total price</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Per person</th>
                                <th v-if="isB2B" class="border border-gray-300 px-2 py-2 text-right">Agent commission</th>
                                <th class="border border-gray-300 px-2 py-2">Offers</th>
                                <template v-if="showNet">
                                    <th class="border border-gray-300 px-2 py-2 text-right">Hotel net</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Total net</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Markup</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Margin</th>
                                </template>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Nights</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="availableRooms(hotel).length === 0">
                                <td :colspan="colCount" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No room available for this stay.</td>
                            </tr>
                            <template v-for="room in availableRooms(hotel)" :key="roomKey(hotel, room)">
                                <tr class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2">
                                        <div class="font-medium">{{ room.room_name }}</div>
                                        <div v-if="room.on_request" class="text-xs font-medium text-amber-700">On request</div>
                                        <div v-for="reason in room.reasons" :key="reason" class="text-xs text-gray-500">{{ reason }}</div>
                                        <div v-for="tax in room.taxes" :key="tax.name" class="text-xs text-gray-500">
                                            incl. {{ tax.name }} {{ money(tax.total) }} ({{ tax.persons }} pers.{{ tax.per === 'night' ? ` × ${result.nights} nights` : '' }}, at cost)
                                        </div>
                                        <div v-if="room.eb_payment_deadline" class="text-xs text-gray-500">
                                            EB payment by {{ room.eb_payment_deadline.split('-').reverse().join('.') }}<span v-if="room.eb_prepayment_pct"> ({{ pct(room.eb_prepayment_pct) }} prepayment)</span>
                                        </div>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-right text-base font-semibold">{{ money(room.selling_price) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right">{{ money(room.per_person) }}</td>
                                    <td v-if="isB2B" class="border border-gray-300 px-2 py-2 text-right">{{ room.commission ? money(room.commission.amount) : '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">
                                        <span v-for="code in room.applied" :key="code" class="mb-1 mr-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">{{ code }}</span>
                                    </td>
                                    <template v-if="showNet">
                                        <td class="border border-gray-300 px-2 py-2 text-right">{{ money(room.hotel_net) }}</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right">{{ money(room.total_net) }}</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right">{{ pct(room.markup.pct) }}<div class="text-xs text-gray-500">{{ room.markup.code }}</div></td>
                                        <td class="border border-gray-300 px-2 py-2 text-right">{{ money(room.margin) }}</td>
                                    </template>
                                    <td class="border border-gray-300 px-2 py-2 text-center">
                                        <button type="button" class="text-xs text-red-600 hover:underline" @click="toggleNights(roomKey(hotel, room))">{{ openNights[roomKey(hotel, room)] ? 'Hide' : 'Show' }}</button>
                                    </td>
                                </tr>
                                <tr v-if="openNights[roomKey(hotel, room)]">
                                    <td :colspan="colCount" class="border border-gray-300 bg-gray-50 px-2 py-2">
                                        <table class="text-xs">
                                            <thead>
                                                <tr class="text-left text-gray-500">
                                                    <th class="pr-4">Night</th>
                                                    <th class="pr-4">Period</th>
                                                    <th v-if="showNet" class="pr-4 text-right">Rate</th>
                                                    <th class="pr-4">Discounts</th>
                                                    <th v-if="showNet" class="text-right">Net</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="night in room.nights" :key="night.date">
                                                    <td class="pr-4">{{ night.date.split('-').reverse().join('.') }}</td>
                                                    <td class="pr-4">{{ night.period }}</td>
                                                    <td v-if="showNet" class="pr-4 text-right">{{ inContract(hotel, night.base) }}</td>
                                                    <td class="pr-4">{{ nightDiscounts(night) }}<span v-if="night.supplement && showNet"> + short stay {{ inContract(hotel, night.supplement) }}</span></td>
                                                    <td v-if="showNet" class="text-right">{{ inContract(hotel, night.net) }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div v-if="showNet" class="mt-2 text-xs text-gray-600">
                                            Hotel {{ money(room.hotel_net) }}<span v-if="hotel.exchange_rate"> ({{ inContract(hotel, room.hotel_net_original) }})</span> + fee {{ money(room.booking_fees) }} + charter {{ money(room.charter_net) }} + transfer {{ money(room.transfer_net) }} = {{ money(room.total_net - (room.tax_total ?? 0)) }} net<span v-if="room.tax_total"> · + taxes {{ money(room.tax_total) }} at cost</span>
                                            <span v-if="room.rate_label"> · rate row: {{ room.rate_label }}</span>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>

                    <div v-if="unavailableRooms(hotel).length" class="mt-2 text-sm">
                        <NiceCheckbox
                            :model-value="Boolean(showUnavailable[hotel.contract.id])"
                            :label="`Show ${unavailableRooms(hotel).length} rooms not available for this stay`"
                            @update:model-value="(v) => (showUnavailable = { ...showUnavailable, [hotel.contract.id]: v })"
                        />
                        <ul v-if="showUnavailable[hotel.contract.id]" class="mt-2 list-disc pl-6 text-gray-500">
                            <li v-for="room in unavailableRooms(hotel)" :key="room.room_code">{{ room.room_name }}: {{ room.reasons.join('; ') }}</li>
                        </ul>
                    </div>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
