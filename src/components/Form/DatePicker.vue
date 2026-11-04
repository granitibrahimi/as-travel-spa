<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { formatApiDate, normalizeApiDate, parseApiDate } from '../../helpers/date';

// The app's dd.mm.yyyy date field (e.g. 04.11.2026). Use it for every date
// field: <DatePicker v-model="from" label="From date" :error="errors.from" />.
// The model value is the API's `d.m.Y` (the same as DateInput), sent and
// received verbatim, and the field always shows dd.mm.yyyy, whatever the
// browser's locale. A native <input type="date"> doesn't: it shows 11/04/2026
// in an en-US browser.
//
// It works like a native date input. Clicking (or tabbing into) it selects
// the day, month or year under the cursor. Digits fill the selected part and
// move on once it is full, ↑ / ↓ step it, ← / → / Tab / . move between the
// parts, and Backspace clears one. Pasting 04.11.2026, 4/11/2026 or 2026-11-04
// works. Alt+↓ or the calendar button opens a Monday-first calendar.
//
// The model only changes when all three parts make a real date (a day past
// the month's end is brought back to its last day) or when all three are
// cleared. Leaving the field half filled in puts the last date back.
defineOptions({ inheritAttrs: false });

const props = defineProps({
    modelValue: { type: [String, null], default: '' }, // d.m.Y
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    id: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// The three parts, in the order they are shown: where each sits in the text,
// its placeholder and its length.
const SEGMENTS = [
    { key: 'd', start: 0, end: 2, placeholder: 'dd' },
    { key: 'm', start: 3, end: 5, placeholder: 'mm' },
    { key: 'y', start: 6, end: 10, placeholder: 'yyyy' },
];

const inputId = props.id || `date-${useId()}`;
const root = ref(null);
const input = ref(null);
const focused = ref(false);
const open = ref(false);
// Each part as digits ('' when empty), and the one selected.
const parts = ref(split(props.modelValue));
const active = ref(0);
// Digits typed into the selected part since it was selected: the first digit
// replaces what was there, the next ones add to it.
let typed = '';
// A focus from a click: the click, not the focus, picks the part.
let pointing = false;
// The month the calendar shows: its 1st.
const view = ref(startOfMonth(parseApiDate(props.modelValue) ?? new Date()));

function split(value) {
    const date = normalizeApiDate(value);

    if (! date) {
        return { d: '', m: '', y: '' };
    }

    const [d, m, y] = date.split('.');

    return { d, m, y };
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

const empty = computed(() => ! parts.value.d && ! parts.value.m && ! parts.value.y);

// What the input shows: the parts, with placeholders for the empty ones; blank
// (so the placeholder shows) when it is empty and not focused.
const text = computed(() => {
    if (empty.value && ! focused.value) {
        return '';
    }

    return SEGMENTS.map((segment) => {
        const value = parts.value[segment.key];

        return value ? value.padStart(segment.end - segment.start, '0') : segment.placeholder;
    }).join('.');
});

watch(() => props.modelValue, (value) => {
    // Keep a half-typed entry while it still stands for the same date.
    if (current() !== (normalizeApiDate(value) ?? (value ? null : ''))) {
        parts.value = split(value);
    }
});

// The date the parts make, as d.m.Y: '' when all empty, null when not a whole
// real date yet. A day past the month's end becomes its last day.
function current() {
    const { d, m, y } = parts.value;

    if (! d && ! m && ! y) {
        return '';
    }

    if (! d || ! m || y.length !== 4 || Number(d) < 1 || Number(m) < 1 || Number(y) < 1900) {
        return null;
    }

    const last = new Date(Number(y), Number(m), 0).getDate();

    return normalizeApiDate(`${Math.min(Number(d), last)}.${m}.${y}`);
}

function commit() {
    const value = current();

    if (value !== null && value !== (props.modelValue ?? '')) {
        emit('update:modelValue', value);
    }
}

function select(index) {
    active.value = Math.max(0, Math.min(SEGMENTS.length - 1, index));
    typed = '';
    nextTick(() => {
        const segment = SEGMENTS[active.value];

        if (document.activeElement === input.value) {
            input.value.setSelectionRange(segment.start, segment.end);
        }
    });
}

function segmentAt(position) {
    const index = SEGMENTS.findIndex((segment) => position <= segment.end);

    return index === -1 ? SEGMENTS.length - 1 : index;
}

function setPart(index, value, apply = true) {
    parts.value = { ...parts.value, [SEGMENTS[index].key]: value };

    if (apply) {
        commit();
    }
}

// A typed digit: like a native date input, a part moves on as soon as no
// other digit could follow (a day from 4, a month from 2, or when full).
function typeDigit(digit) {
    const index = active.value;
    const key = SEGMENTS[index].key;
    typed += digit;

    const full = key === 'y'
        ? typed.length >= 4
        : typed.length >= 2 || Number(typed) > (key === 'd' ? 3 : 1);

    let value = typed;

    if (key !== 'y' && full) {
        const max = key === 'd' ? 31 : 12;
        value = String(Math.min(Math.max(Number(typed), 1), max)).padStart(2, '0');
    }
    // A part still being typed waits (no reload per keystroke); blur sends it.
    setPart(index, value, full);

    if (full) {
        if (index < SEGMENTS.length - 1) {
            select(index + 1);
        } else {
            typed = '';
            select(index);
        }
    } else {
        select(index);
        typed = value;
    }
}

// ↑ / ↓: step the selected part, round the month and day; an empty part
// starts from today.
function step(delta) {
    const index = active.value;
    const key = SEGMENTS[index].key;
    const now = new Date();
    const value = parts.value[key];
    let next;

    if (key === 'y') {
        next = String(value ? Math.max(1900, Number(value) + delta) : now.getFullYear());
    } else {
        const max = key === 'd' ? 31 : 12;
        const start = key === 'd' ? now.getDate() : now.getMonth() + 1;
        const number = value ? ((Number(value) - 1 + delta + max) % max) + 1 : start;
        next = String(number).padStart(2, '0');
    }
    setPart(index, next);
    select(index);
}

function clearPart() {
    const index = active.value;

    if (! parts.value[SEGMENTS[index].key] && index > 0) {
        select(index - 1);

        return;
    }
    setPart(index, '');
    select(index);
}

function onKeydown(event) {
    if (event.ctrlKey || event.metaKey) {
        return; // copy, paste, select all, …
    }

    if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        toggle();

        return;
    }

    if (event.altKey) {
        return;
    }

    const handlers = {
        ArrowLeft: () => select(active.value - 1),
        ArrowRight: () => select(active.value + 1),
        ArrowUp: () => step(1),
        ArrowDown: () => step(-1),
        Home: () => select(0),
        End: () => select(SEGMENTS.length - 1),
        Backspace: clearPart,
        Delete: clearPart,
        Escape: () => (open.value ? close() : select(active.value)),
    };

    if (event.key === 'Tab') {
        // Through the parts first, then out of the field.
        const next = active.value + (event.shiftKey ? -1 : 1);

        if (next >= 0 && next < SEGMENTS.length) {
            event.preventDefault();
            select(next);
        }

        return;
    }

    if (event.key === 'Enter') {
        commit();

        return;
    }

    if (handlers[event.key]) {
        event.preventDefault();
        handlers[event.key]();

        return;
    }

    if (event.key.length === 1) {
        event.preventDefault();
        insert(event.key);
    }
}

function insert(characters) {
    for (const character of characters) {
        if (/\d/.test(character)) {
            typeDigit(character);
        } else if (/[./\-\s,]/.test(character) && typed) {
            select(active.value + 1);
        }
    }
}

// Typing that keydown didn't see (an on-screen keyboard reports no key):
// handled here instead of letting it change the text.
function onBeforeInput(event) {
    event.preventDefault();

    if (event.inputType?.startsWith('delete')) {
        clearPart();
    } else if (event.data) {
        insert(event.data);
    }
}

function onPaste(event) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const iso = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(pasted);
    const date = normalizeApiDate(iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : pasted)
        ?? normalizeApiDate(pasted.replace(/^\s*(\d{2})(\d{2})(\d{4})\s*$/, '$1.$2.$3'));

    if (date) {
        parts.value = split(date);
        commit();
        select(SEGMENTS.length - 1);
    }
}

function onFocus() {
    // From the keyboard the day comes first; a click picks its own part.
    focused.value = true;

    if (! pointing) {
        select(0);
    }
}

// After a click (or a drag), select the part the cursor is in.
function onPointerUp() {
    pointing = false;
    nextTick(() => select(segmentAt(input.value?.selectionStart ?? 0)));
}

function onBlur() {
    focused.value = false;
    typed = '';

    if (current() === null) {
        parts.value = split(props.modelValue);
    } else {
        parts.value = split(current());
        commit();
    }
}

function onInputFallback(event) {
    // Anything that got past beforeinput (old browsers, autofill): read it as
    // a pasted date, then show the parts again.
    const date = normalizeApiDate(event.target.value);

    if (date) {
        parts.value = split(date);
        commit();
    }
    event.target.value = text.value;
}

function toggle() {
    if (props.disabled) {
        return;
    }
    open.value = ! open.value;

    if (open.value) {
        view.value = startOfMonth(parseApiDate(current() || props.modelValue) ?? new Date());
    }
}

function close() {
    open.value = false;
}

function shift(months) {
    view.value = new Date(view.value.getFullYear(), view.value.getMonth() + months, 1);
}

function pick(date) {
    parts.value = split(formatApiDate(date));
    commit();
    close();
    input.value?.focus();
}

function clear() {
    parts.value = split('');
    commit();
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

const selected = computed(() => current() || props.modelValue || '');
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
    <div ref="root" class="relative">
        <label v-if="label" :for="inputId" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
        <div class="relative">
            <input
                :id="inputId"
                ref="input"
                v-bind="$attrs"
                :value="text"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                spellcheck="false"
                placeholder="dd.mm.yyyy"
                :disabled="disabled"
                class="w-full cursor-text rounded border py-1.5 pl-2 pr-9 text-base font-normal leading-normal tabular-nums caret-transparent selection:bg-red-100 selection:text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                :class="[error ? 'border-red-500' : 'border-gray-300', focused && empty ? 'text-gray-400' : '']"
                @keydown="onKeydown"
                @beforeinput="onBeforeInput"
                @input="onInputFallback"
                @paste="onPaste"
                @focus="onFocus"
                @blur="onBlur"
                @mousedown="pointing = true"
                @touchstart.passive="pointing = true"
                @mouseup="onPointerUp"
                @touchend="onPointerUp"
            >
            <button
                type="button"
                tabindex="-1"
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

        <div v-if="open" class="absolute left-0 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg" role="dialog" aria-label="Choose a date" @keydown.esc="close">
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
