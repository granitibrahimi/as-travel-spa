<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { openFileInNewTab } from '../../../helpers/download.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DatePicker from '../../../components/Form/DatePicker.vue';
import Select from '../../../components/Form/Select.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const upload = ref(null);
const form = ref(null); // { hotel_contract_id, first_date, last_date, rooms: [{ label, room_code, days: { iso: status } }] }
const dirty = ref(false);
const message = ref('');
const errorText = ref('');
let timer = null;

// ---------------------------------------------------------------- dates (UTC, ISO yyyy-mm-dd)
const iso = (d) => d.toISOString().slice(0, 10);
const parseIso = (s) => new Date(`${s}T00:00:00Z`);
const toIso = (dmy) => (dmy ? dmy.split('.').reverse().join('-') : '');
const addDays = (s, n) => { const d = parseIso(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

function rangesToDays(closed) {
    const days = {};
    for (const r of closed ?? []) {
        for (let d = r.from; d <= r.to; d = addDays(d, 1)) days[d] = r.status;
    }
    return days;
}

function daysToRanges(days) {
    const out = [];
    for (const d of Object.keys(days).sort()) {
        const last = out[out.length - 1];
        if (last && last.status === days[d] && addDays(last.to, 1) === d) last.to = d;
        else out.push({ from: d, to: d, status: days[d] });
    }
    return out;
}

async function load() {
    clearTimeout(timer);
    const data = castResource((await api.get(`/hotel-availability-uploads/${id}`)).data);
    upload.value = data;
    if (data.status === 'processing') {
        timer = setTimeout(load, 4000);
        return;
    }
    form.value = {
        hotel_contract_id: data.contract?.id ?? null,
        first_date: data.first_date ?? '',
        last_date: data.last_date ?? '',
        rooms: data.rooms.map((r) => ({ label: r.label, room_code: r.room_code ?? '', days: rangesToDays(r.closed) })),
    };
    dirty.value = false;
}
onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));

const canEdit = computed(() => Boolean(upload.value?.can_edit));
const contract = computed(() => upload.value?.contracts.find((c) => c.id === Number(form.value?.hotel_contract_id)) ?? null);
const contractOptions = computed(() => (upload.value?.contracts ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.hotel ?? c.code})` })));
const roomOptions = computed(() => [{ value: '', label: '— not used —' }, ...(contract.value?.rooms ?? []).map((r) => ({ value: r.code, label: r.name }))]);

// months covered by the chart
const months = computed(() => {
    const first = toIso(form.value?.first_date);
    const last = toIso(form.value?.last_date);
    if (! first || ! last || first > last) return [];
    const out = [];
    const d = parseIso(first.slice(0, 8) + '01');
    while (iso(d) <= last && out.length < 24) {
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        out.push({
            key: `${y}-${m}`,
            label: d.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
            days: Array.from({ length: count }, (_, i) => {
                const day = new Date(Date.UTC(y, m, i + 1));
                return { iso: iso(day), n: i + 1, wd: day.toLocaleString('en', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2), inRange: iso(day) >= first && iso(day) <= last };
            }),
        });
        d.setUTCMonth(m + 1);
    }
    return out;
});

const NEXT = { undefined: 'sold_out', sold_out: 'on_request', on_request: undefined };
function cycle(room, day) {
    if (! canEdit.value || ! day.inRange) return;
    const next = NEXT[room.days[day.iso]];
    if (next) room.days[day.iso] = next;
    else delete room.days[day.iso];
    dirty.value = true;
}
const cellClass = (room, day) => {
    if (! day.inRange) return 'bg-gray-300';
    const s = room.days[day.iso];
    return s === 'sold_out' ? 'bg-red-500 text-white' : s === 'on_request' ? 'bg-yellow-300' : 'bg-green-300';
};

const saving = ref(false);
async function save() {
    errorText.value = '';
    await api.put(`/hotel-availability-uploads/${id}`, {
        hotel_contract_id: form.value.hotel_contract_id,
        first_date: form.value.first_date,
        last_date: form.value.last_date,
        rooms: form.value.rooms.map((r) => ({ label: r.label, room_code: r.room_code || null, closed: daysToRanges(r.days) })),
    });
}

async function run(fn) {
    if (saving.value) return;
    saving.value = true;
    message.value = '';
    errorText.value = '';
    try {
        await fn();
    } catch (error) {
        if (error.response?.status === 422) {
            errorText.value = Object.values(error.response.data.errors ?? {})[0]?.[0] ?? error.response.data.message;
        } else {
            throw error;
        }
    } finally {
        saving.value = false;
    }
}

const saveOnly = () => run(async () => { await save(); await load(); message.value = 'Corrections saved.'; });
const confirmApply = ref(false);
const applyChart = () => run(async () => {
    confirmApply.value = false;
    await save();
    const { data } = await api.post(`/hotel-availability-uploads/${id}/apply`);
    await load();
    message.value = data.message;
});
const readAgain = () => run(async () => { await api.post(`/hotel-availability-uploads/${id}/read-again`); form.value = null; await load(); });
const openOriginal = () => openFileInNewTab(`/hotel-availability-uploads/${id}/file`, { type: upload.value.original_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png' });

const unmatched = computed(() => (form.value?.rooms ?? []).filter((r) => ! r.room_code).length);
const statusText = { processing: 'Reading the chart…', ready: 'To review', applied: 'Applied', failed: 'Could not be read' };
</script>

<template>
    <AppLayout title="Availability Chart" fluid>
        <Loader v-if="! upload" />
        <template v-else>
            <FullWidthBox :title="upload.original_name" :collapsible="false">
                <template #actions>
                    <Button size="sm" @click="openOriginal">Open original</Button>
                </template>
                <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                    <div><div class="text-xs uppercase text-gray-500">Status</div>{{ statusText[upload.status] ?? upload.status }}<span v-if="upload.applied_at" class="text-xs text-gray-500"> ({{ upload.applied_at }})</span></div>
                    <div><div class="text-xs uppercase text-gray-500">Hotel on the chart</div>{{ upload.hotel_name ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Chart date</div>{{ upload.as_of ?? '—' }}</div>
                    <div><div class="text-xs uppercase text-gray-500">Uploaded</div>{{ upload.created_at }} {{ upload.user }}</div>
                </div>
                <div v-if="upload.status === 'processing'" class="mt-4 flex items-center gap-2 text-sm text-gray-600"><Loader /> AI is reading the chart, this takes up to a minute or two.</div>
                <div v-if="upload.status === 'failed'" class="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ upload.error }}</div>
                <p v-if="upload.notes" class="mt-3 rounded bg-blue-50 p-2 text-sm text-blue-900">AI note: {{ upload.notes }}</p>
                <div v-if="canEdit && upload.status !== 'processing' && upload.status !== 'applied'" class="mt-3">
                    <button type="button" class="text-xs text-red-600 hover:underline" @click="readAgain">Read again with AI</button>
                </div>
            </FullWidthBox>

            <template v-if="form">
                <FullWidthBox title="Contract and dates" class="mt-6" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div class="md:col-span-2">
                            <Select v-model="form.hotel_contract_id" :options="contractOptions" label="Hotel contract *" placeholder="Pick the contract" :disabled="! canEdit" @update:model-value="dirty = true" />
                        </div>
                        <DatePicker v-model="form.first_date" label="Chart covers from *" :disabled="! canEdit" @update:model-value="dirty = true" />
                        <DatePicker v-model="form.last_date" label="to *" :disabled="! canEdit" @update:model-value="dirty = true" />
                    </div>
                    <p class="mt-2 text-xs text-gray-500">Applying replaces the stop sales of earlier charts between these dates. Dates outside stay as they are.</p>
                </FullWidthBox>

                <FullWidthBox title="Rooms" class="mt-6" :collapsible="false">
                    <p class="mb-3 text-xs text-gray-600">
                        Compare with the original. Click a day to change it: green available → red sold out → yellow on request → green.
                        Rows set to "not used" are ignored.
                        <span v-if="unmatched" class="font-medium text-red-600">{{ unmatched }} {{ unmatched === 1 ? "row has" : "rows have" }} no room.</span>
                    </p>
                    <div class="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div v-for="(room, i) in form.rooms" :key="i" class="flex items-center gap-2 text-sm">
                            <span class="w-1/2 truncate" :title="room.label">{{ room.label }}</span>
                            <div class="w-1/2"><Select v-model="room.room_code" :options="roomOptions" :placeholder="null" :disabled="! canEdit" @update:model-value="dirty = true" /></div>
                        </div>
                    </div>

                    <div v-for="month in months" :key="month.key" class="mb-4 overflow-x-auto">
                        <table class="border-collapse text-[10px]">
                            <thead>
                                <tr>
                                    <th class="sticky left-0 min-w-[220px] bg-gray-700 px-2 py-1 text-left text-xs text-white">{{ month.label }}</th>
                                    <th v-for="day in month.days" :key="day.iso" class="w-6 border border-gray-300 bg-gray-100 px-0.5 text-center font-normal">{{ day.wd }}<br>{{ day.n }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(room, i) in form.rooms" :key="i" :class="room.room_code ? '' : 'opacity-40'">
                                    <td class="sticky left-0 truncate border border-gray-300 bg-white px-2 py-0.5 text-xs" style="max-width: 220px;">{{ room.label }}</td>
                                    <td
                                        v-for="day in month.days"
                                        :key="day.iso"
                                        class="h-5 w-6 border border-white"
                                        :class="[cellClass(room, day), canEdit && day.inRange ? 'cursor-pointer' : '']"
                                        :title="`${room.label} ${day.n} ${month.label}`"
                                        @click="cycle(room, day)"
                                    />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="canEdit" class="mt-4 flex flex-wrap items-center gap-3">
                        <Button variant="primary" :disabled="saving || ! form.hotel_contract_id" @click="confirmApply = true">{{ upload.status === 'applied' ? 'Apply again' : 'Apply to contract' }}</Button>
                        <Button :disabled="saving || ! dirty" @click="saveOnly">Save corrections</Button>
                        <span v-if="message" class="text-sm text-green-700">{{ message }}</span>
                        <span v-if="errorText" class="text-sm text-red-600">{{ errorText }}</span>
                    </div>
                </FullWidthBox>
            </template>

            <div class="mt-4 text-sm">
                <RouterLink :to="routeUrl('hotelAvailability.list')" class="text-red-600 hover:underline">← All charts</RouterLink>
                <RouterLink v-if="contract" :to="routeUrl('hotelContracts.show', contract.id)" class="ml-4 text-red-600 hover:underline">Open contract</RouterLink>
            </div>
        </template>

        <ConfirmDialog
            :show="confirmApply"
            title="Apply this chart?"
            :message="contract ? `Stop sales of ${contract.name} between ${form?.first_date} and ${form?.last_date} will be replaced by this chart. Package Search uses them right away.` : ''"
            confirm-label="Yes, apply"
            :processing="saving"
            @confirm="applyChart"
            @cancel="confirmApply = false"
        />
    </AppLayout>
</template>
