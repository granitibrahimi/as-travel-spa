<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { formatApiDate, normalizeApiDate, parseApiDate } from '../../helpers/date';

// Date field that always shows and takes dd.mm.yyyy (e.g. 04.11.2026), with
// its own calendar. Unlike DateInput (a native <input type="date">, shown in
// the browser's locale order, e.g. 11/04/2026 in an en-US browser), what you
// see is what the API gets. The model value is the API's `d.m.Y`, so it is a
// drop-in for DateInput.
//
// Typing: the dots are added as you go (0411 → 04.11.), `4.11.2026`,
// `4/11/2026` and a pasted `04112026` all work. The model only changes once
// the field holds a whole, real date (or is emptied); on blur an unfinished
// entry goes back to the last date. Enter applies what is typed.
defineOptions({ inheritAttrs: false });

const props = defineProps({
    modelValue: { type: [String, null], default: '' }, // d.m.Y
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    placeholder: { type: String, default: 'dd.mm.yyyy' },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const root = ref(null);
const input = ref(null);
const text = ref(props.modelValue ?? '');
const open = ref(false);
// The month the calendar shows: its 1st.
const view = ref(startOfMonth(parseApiDate(props.modelValue) ?? new Date()));

watch(() => props.modelValue, (value) => {
    // Leave an entry being typed alone when it already means this date.
    if (normalizeApiDate(text.value) !== (value || null)) {
        text.value = value ?? '';
    }
});

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function commit(value) {
    if (value !== (props.modelValue ?? '')) {
        emit('update:modelValue', value);
    }
}

// Separators become dots, anything else is dropped; dots are added after the
// day and the month as they are typed; 8 bare digits are split as ddmmyyyy.
function mask(raw, growing) {
    let value = raw.replace(/[/-]/g, '.').replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.');

    if (! value.includes('.') && value.length > 2) {
        const digits = value.slice(0, 8);
        value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('.');
    }

    value = value.slice(0, 10);

    if (growing && /^(\d{2}|\d{1,2}\.\d{2})$/.test(value)) {
        value += '.';
    }

    return value;
}

function onInput(event) {
    const raw = event.target.value;
    const value = mask(raw, raw.length > text.value.length);

    if (value !== raw) {
        event.target.value = value;
    }
    text.value = value;

    if (value === '') {
        commit('');

        return;
    }

    const date = normalizeApiDate(value);

    if (date) {
        commit(date);
        view.value = startOfMonth(parseApiDate(date));
    }
}

function settle() {
    const date = normalizeApiDate(text.value);

    if (text.value === '') {
        commit('');
    } else if (date) {
        commit(date);
        text.value = date;
    } else {
        text.value = props.modelValue ?? '';
    }
}

function toggle() {
    if (props.disabled) {
        return;
    }
    open.value = ! open.value;

    if (open.value) {
        view.value = startOfMonth(parseApiDate(normalizeApiDate(text.value) ?? props.modelValue) ?? new Date());
    }
}

function close() {
    open.value = false;
}

function shift(months) {
    view.value = new Date(view.value.getFullYear(), view.value.getMonth() + months, 1);
}

function pick(date) {
    const value = formatApiDate(date);
    text.value = value;
    commit(value);
    close();
    nextTick(() => input.value?.focus());
}

function clear() {
    text.value = '';
    commit('');
    close();
}

// The weeks of the month in view, Monday first; days outside it are null.
const weeks = computed(() => {
    const year = view.value.getFullYear();
    const month = view.value.getMonth();
    const lead = (view.value.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [
        ...Array(lead).fill(null),
        ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
    ];

    while (cells.length % 7) {
        cells.push(null);
    }

    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
});

const selected = computed(() => normalizeApiDate(text.value) ?? props.modelValue ?? '');
const today = computed(() => formatApiDate(new Date()));

function dayClass(date) {
    const value = formatApiDate(date);

    if (value === selected.value) {
        return 'bg-red-600 font-semibold text-white hover:bg-red-700';
    }

    return value === today.value ? 'text-red-600 font-semibold ring-1 ring-inset ring-red-300 hover:bg-gray-100' : 'text-gray-700 hover:bg-gray-100';
}

function onDocumentPointer(event) {
    if (! root.value?.contains(event.target)) {
        close();
    }
}

watch(open, (isOpen) => {
    if (isOpen) {
        document.addEventListener('mousedown', onDocumentPointer);
    } else {
        document.removeEventListener('mousedown', onDocumentPointer);
    }
});

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointer));
</script>

<template>
    <div ref="root" class="relative" @keydown.esc="close">
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <div class="relative">
            <input
                ref="input"
                v-bind="$attrs"
                :value="text"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                maxlength="10"
                :placeholder="placeholder"
                :disabled="disabled"
                class="w-full rounded border py-1.5 pl-2 pr-9 text-base font-normal leading-normal tabular-nums focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                :class="error ? 'border-red-500' : 'border-gray-300'"
                @input="onInput"
                @blur="settle"
                @keydown.enter="settle"
            >
            <button
                type="button"
                class="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                :disabled="disabled"
                :aria-expanded="open"
                aria-label="Open calendar"
                @click="toggle"
            >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                    <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
                    <path d="M3 8.5h14M7 2.5v4M13 2.5v4" stroke-linecap="round" />
                </svg>
            </button>
        </div>

        <div v-if="open" class="absolute left-0 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg" role="dialog" aria-label="Choose a date">
            <div class="mb-2 flex items-center justify-between text-sm">
                <div class="flex">
                    <button type="button" class="rounded px-1.5 py-1 text-gray-500 hover:bg-gray-100" aria-label="Previous year" @click="shift(-12)">«</button>
                    <button type="button" class="rounded px-1.5 py-1 text-gray-500 hover:bg-gray-100" aria-label="Previous month" @click="shift(-1)">‹</button>
                </div>
                <span class="font-semibold text-gray-800">{{ MONTHS[view.getMonth()] }} {{ view.getFullYear() }}</span>
                <div class="flex">
                    <button type="button" class="rounded px-1.5 py-1 text-gray-500 hover:bg-gray-100" aria-label="Next month" @click="shift(1)">›</button>
                    <button type="button" class="rounded px-1.5 py-1 text-gray-500 hover:bg-gray-100" aria-label="Next year" @click="shift(12)">»</button>
                </div>
            </div>

            <table class="w-full table-fixed text-center text-sm">
                <thead>
                    <tr class="text-xs text-gray-400">
                        <th v-for="weekday in WEEKDAYS" :key="weekday" class="pb-1 font-medium">{{ weekday }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(week, i) in weeks" :key="i">
                        <td v-for="(date, j) in week" :key="j" class="p-0.5">
                            <button
                                v-if="date"
                                type="button"
                                class="h-8 w-full rounded tabular-nums"
                                :class="dayClass(date)"
                                :aria-label="formatApiDate(date)"
                                @click="pick(date)"
                            >
                                {{ date.getDate() }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="mt-2 flex justify-between border-t border-gray-100 pt-2 text-xs">
                <button type="button" class="rounded px-2 py-1 font-medium text-red-600 hover:bg-gray-100" @click="pick(new Date())">Today</button>
                <button type="button" class="rounded px-2 py-1 text-gray-500 hover:bg-gray-100" @click="clear">Clear</button>
            </div>
        </div>

        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>
