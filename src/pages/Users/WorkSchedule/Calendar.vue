<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';

// Read-only view of the agents' work schedule. Data comes from the same
// endpoint as the editable page, but there is no add/delete here.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n) => String(n).padStart(2, '0');
const key = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const VACATION_COLOR = '#495057';
const HOLIDAY_COLOR = '#df4444';

const events = ref([]);
const shifts = ref([]);
const ready = ref(false);

// Legend color the calendar is currently filtered to (null = show everything).
const activeColor = ref(null);

function toggleFilter(color) {
    activeColor.value = activeColor.value === color ? null : color;
}

onMounted(async () => {
    const { data } = await api.get('/users/work-schedule');
    events.value = castResource(data).events ?? [];
    shifts.value = castResource(data).shifts ?? [];
    ready.value = true;
});

// Events matching the active legend filter (all of them when none is picked).
const visibleEvents = computed(() => (
    activeColor.value
        ? events.value.filter((event) => event.color === activeColor.value)
        : events.value
));

// Class for a footer legend item: dim the others while a filter is active,
// and highlight the selected one.
const legendClass = (color) => [
    'flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-xs transition',
    activeColor.value === color ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50',
    activeColor.value && activeColor.value !== color ? 'opacity-40' : '',
];

// Expand each event across its inclusive date range into a per-day lookup.
const eventsByDay = computed(() => {
    const map = {};

    visibleEvents.value.forEach((event) => {
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
</script>

<template>
    <AppLayout title="Work schedule" fluid>
        <Loader v-if="! ready" />
        <FullWidthBox v-else :collapsible="false">
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
                            <div
                                v-for="event in cell.events"
                                :key="event.id + cell.key"
                                class="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-white"
                                :style="{ backgroundColor: event.color }"
                                :title="event.title + (event.subtitle ? ` · ${event.subtitle}` : '')"
                            >
                                {{ event.title }}
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            <template #footer>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <button
                        v-for="shift in shifts"
                        :key="shift.value"
                        type="button"
                        :class="legendClass(shift.color)"
                        :aria-pressed="activeColor === shift.color"
                        :title="`Filter by ${shift.label}`"
                        @click="toggleFilter(shift.color)"
                    >
                        <span class="inline-block h-3 w-3 rounded" :style="{ backgroundColor: shift.color }" />
                        <span class="font-medium">{{ shift.label }}</span>
                        <span class="text-gray-400">{{ shift.time }}</span>
                    </button>
                    <button
                        type="button"
                        :class="legendClass(VACATION_COLOR)"
                        :aria-pressed="activeColor === VACATION_COLOR"
                        title="Filter by Vacation"
                        @click="toggleFilter(VACATION_COLOR)"
                    >
                        <span class="inline-block h-3 w-3 rounded" :style="{ backgroundColor: VACATION_COLOR }" />
                        <span class="font-medium">Vacation</span>
                    </button>
                    <button
                        type="button"
                        :class="legendClass(HOLIDAY_COLOR)"
                        :aria-pressed="activeColor === HOLIDAY_COLOR"
                        title="Filter by Official holiday"
                        @click="toggleFilter(HOLIDAY_COLOR)"
                    >
                        <span class="inline-block h-3 w-3 rounded" :style="{ backgroundColor: HOLIDAY_COLOR }" />
                        <span class="font-medium">Official holiday</span>
                    </button>

                    <button
                        v-if="activeColor"
                        type="button"
                        class="ml-1 rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        @click="activeColor = null"
                    >
                        Clear filter
                    </button>
                </div>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
