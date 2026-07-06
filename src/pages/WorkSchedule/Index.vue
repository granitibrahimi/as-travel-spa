<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Select from '../../components/Form/Select.vue';
import InputText from '../../components/Form/InputText.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();
const canSave = computed(() => auth.can('workSchedule.index'));
const canDelete = computed(() => auth.can('workSchedule.delete'));

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n) => String(n).padStart(2, '0');
const key = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const events = ref([]);
const agents = ref([]);
const shifts = ref([]);
const ready = ref(false);

async function fetchSchedule() {
    const { data } = await api.get('/work-schedule');
    events.value = data.events ?? [];
    agents.value = data.agents ?? [];
    shifts.value = data.shifts ?? [];
    ready.value = true;
}

onMounted(fetchSchedule);

// Expand each event across its inclusive date range into a per-day lookup.
const eventsByDay = computed(() => {
    const map = {};

    events.value.forEach((event) => {
        const cursor = parse(event.start);
        const end = parse(event.end);

        while (cursor <= end) {
            (map[key(cursor)] ??= []).push(event);
            cursor.setDate(cursor.getDate() + 1);
        }
    });

    return map;
});

const today = new Date();
const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth()); // 0-indexed

const monthLabel = computed(() => new Date(viewYear.value, viewMonth.value, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));

// 6-week grid starting on the Monday on/before the 1st.
const weeks = computed(() => {
    const first = new Date(viewYear.value, viewMonth.value, 1);
    const offset = (first.getDay() + 6) % 7; // days since Monday
    const start = new Date(viewYear.value, viewMonth.value, 1 - offset);

    const cells = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        cells.push({
            key: key(date),
            day: date.getDate(),
            inMonth: date.getMonth() === viewMonth.value,
            isToday: key(date) === key(today),
            events: eventsByDay.value[key(date)] ?? [],
        });
    }

    return Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
});

function shiftMonth(delta) {
    const date = new Date(viewYear.value, viewMonth.value + delta, 1);
    viewYear.value = date.getFullYear();
    viewMonth.value = date.getMonth();
}

function goToday() {
    viewYear.value = today.getFullYear();
    viewMonth.value = today.getMonth();
}

const form = reactive({
    agent_id: null,
    shift: null,
    date: '',
});
const errors = ref({});
const processing = ref(false);

async function addShift() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post('/work-schedule', form);
        form.date = '';
        await fetchSchedule();
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

const toDelete = ref(null);
const deleting = ref(false);

function requestDelete(event) {
    if (event.deletable && canDelete.value) {
        toDelete.value = event;
    }
}

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/work-schedule/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchSchedule();
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout title="Work schedule" fluid>
        <Loader v-if="! ready" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div class="lg:col-span-1">
                <FullWidthBox title="Add shift" :collapsible="false">
                    <form v-if="canSave" class="space-y-4" @submit.prevent="addShift">
                        <Select v-model="form.agent_id" :options="agents" label="Agent *" :error="errors.agent_id" />
                        <Select v-model="form.shift" :options="shifts" label="Shift *" :error="errors.shift" />
                        <InputText v-model="form.date" type="date" label="Date *" :error="errors.date" />
                        <Button type="submit" variant="primary" class="w-full" :disabled="processing">
                            {{ processing ? 'Adding…' : 'Add shift' }}
                        </Button>
                    </form>
                    <p v-else class="text-sm text-gray-400">You do not have permission to add shifts.</p>

                    <template #footer>
                        <div class="space-y-1.5">
                            <div v-for="shift in shifts" :key="shift.value" class="flex items-center gap-2 text-xs">
                                <span class="inline-block h-3 w-3 rounded" :style="{ backgroundColor: shift.color }" />
                                <span class="font-medium">{{ shift.label }}</span>
                                <span class="text-gray-400">{{ shift.time }}</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <span class="inline-block h-3 w-3 rounded" style="background-color: #495057" />
                                <span class="font-medium">Vacation</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <span class="inline-block h-3 w-3 rounded" style="background-color: #df4444" />
                                <span class="font-medium">Official holiday</span>
                            </div>
                        </div>
                    </template>
                </FullWidthBox>
            </div>

            <div class="lg:col-span-3">
                <FullWidthBox :collapsible="false">
                    <template #title>
                        <span class="font-semibold">{{ monthLabel }}</span>
                    </template>
                    <template #actions>
                        <Button size="sm" @click="shiftMonth(-1)">‹</Button>
                        <Button size="sm" @click="goToday">Today</Button>
                        <Button size="sm" @click="shiftMonth(1)">›</Button>
                    </template>

                    <div class="grid grid-cols-7 border-l border-t border-gray-200 text-sm">
                        <div
                            v-for="weekday in WEEKDAYS"
                            :key="weekday"
                            class="border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-xs font-semibold uppercase text-gray-500"
                        >
                            {{ weekday }}
                        </div>

                        <template v-for="(week, wi) in weeks" :key="wi">
                            <div
                                v-for="cell in week"
                                :key="cell.key"
                                class="min-h-[92px] border-b border-r border-gray-200 p-1 align-top"
                                :class="cell.inMonth ? 'bg-white' : 'bg-gray-50'"
                            >
                                <div class="mb-1 text-right text-xs" :class="[cell.inMonth ? 'text-gray-500' : 'text-gray-300', cell.isToday ? 'font-bold text-red-600' : '']">
                                    {{ cell.day }}
                                </div>
                                <div class="space-y-0.5">
                                    <button
                                        v-for="event in cell.events"
                                        :key="event.id + cell.key"
                                        type="button"
                                        class="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-white"
                                        :class="(event.deletable && canDelete) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'"
                                        :style="{ backgroundColor: event.color }"
                                        :title="event.title + (event.subtitle ? ` · ${event.subtitle}` : '')"
                                        @click="requestDelete(event)"
                                    >
                                        {{ event.title }}
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </FullWidthBox>
            </div>
        </div>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Remove shift?"
            :message="toDelete ? `${toDelete.title} on ${toDelete.start} will be removed.` : ''"
            confirm-label="Yes, remove"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
