<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import api from '../../helpers/api';

const props = defineProps({
    modelValue: { type: [Number, String, null], default: null },
    // Endpoint returning an array of records; searched via `?q=`.
    url: { type: String, required: true },
    placeholder: { type: String, default: 'Search…' },
    // Preselected option { id, name } (e.g. when editing).
    initialOption: { type: Object, default: null },
    labelKey: { type: String, default: 'name' },
    valueKey: { type: String, default: 'id' },
    minChars: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    // Extra query params merged into the request (e.g. { parent_destination_id: 5 }).
    params: { type: Object, default: () => ({}) },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const search = ref(props.initialOption ? props.initialOption[props.labelKey] ?? '' : '');
const selectedLabel = ref(search.value);
const results = ref([]);
const open = ref(false);
const loading = ref(false);
const highlighted = ref(-1);
const listRef = ref(null);
const wrapperRef = ref(null);
const dropdownStyle = ref({});
let debounce = null;
let blurTimer = null;

// The dropdown is teleported to <body> (so parent overflow can't clip it), which
// means we position it manually against the input's viewport rect.
function updatePosition() {
    const el = wrapperRef.value;

    if (!el) {
        return;
    }

    const rect = el.getBoundingClientRect();

    dropdownStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
    };
}

watch(open, (isOpen) => {
    if (isOpen) {
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
    } else {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
    }
});

function fetchResults() {
    loading.value = true;

    api
        .get(props.url, { params: { q: search.value, ...props.params } })
        .then(({ data }) => {
            const rows = Array.isArray(data) ? data : (data.data ?? []);
            results.value = rows.map((row) => ({
                value: row[props.valueKey],
                label: row[props.labelKey],
            }));
        })
        .catch(() => {
            results.value = [];
        })
        .finally(() => {
            loading.value = false;
            highlighted.value = results.value.length ? 0 : -1;
        });
}

watch(search, (value) => {
    // Editing (or clearing) the query away from the current selection reopens
    // the list and drops the previous pick until a new one is chosen.
    if (value !== selectedLabel.value) {
        if (props.modelValue !== null) {
            emit('update:modelValue', null);
            emit('change', null);
        }

        open.value = true;
    }

    // Below the minimum length we wait for more input — unless the field is
    // now empty, in which case we refetch so the full list shows again.
    if (value.length && value.length < props.minChars) {
        results.value = [];
        return;
    }

    clearTimeout(debounce);
    debounce = setTimeout(fetchResults, 250);
});

// Keep the highlighted option scrolled into view while arrowing through the list.
watch(highlighted, (index) => {
    if (index < 0 || !listRef.value) {
        return;
    }

    listRef.value.children[index]?.scrollIntoView({ block: 'nearest' });
});

function onFocus() {
    clearTimeout(blurTimer);
    open.value = true;

    if (results.value.length === 0) {
        fetchResults();
    } else {
        highlighted.value = 0;
    }
}

function onBlur() {
    // Delay so an option click registers before the dropdown closes.
    blurTimer = setTimeout(() => {
        open.value = false;
    }, 150);
}

function onKeydown(event) {
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && !open.value) {
        onFocus();
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        highlighted.value = Math.min(highlighted.value + 1, results.value.length - 1);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        highlighted.value = Math.max(highlighted.value - 1, 0);
    } else if (event.key === 'Enter') {
        if (open.value && highlighted.value >= 0 && results.value[highlighted.value]) {
            event.preventDefault();
            select(results.value[highlighted.value]);
        }
    } else if (event.key === 'Escape') {
        open.value = false;
    }
}

function select(option) {
    emit('update:modelValue', option.value);
    emit('change', option);
    search.value = option.label;
    selectedLabel.value = option.label;
    open.value = false;
    highlighted.value = -1;
}

function clear() {
    search.value = '';
    selectedLabel.value = '';
    results.value = [];
    highlighted.value = -1;
    emit('update:modelValue', null);
    emit('change', null);
}

onBeforeUnmount(() => {
    clearTimeout(debounce);
    clearTimeout(blurTimer);
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
});
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>

        <div class="relative">
            <div ref="wrapperRef" class="relative">
                <input
                    v-model="search"
                    type="text"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    autocomplete="off"
                    role="combobox"
                    :aria-expanded="open"
                    class="w-full rounded border border-gray-300 py-1.5 pl-3 pr-9 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                    @focus="onFocus"
                    @blur="onBlur"
                    @keydown="onKeydown"
                >
                <button
                    v-if="modelValue !== null || search"
                    type="button"
                    class="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-gray-400 hover:text-gray-600"
                    tabindex="-1"
                    @click="clear"
                >
                    ×
                </button>
            </div>

            <Teleport to="body">
                <ul
                    v-if="open"
                    ref="listRef"
                    :style="dropdownStyle"
                    class="z-50 max-h-56 overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg"
                >
                    <li v-if="loading" class="px-3 py-1.5 text-sm text-gray-400">Loading…</li>
                    <li v-else-if="results.length === 0" class="px-3 py-1.5 text-sm text-gray-400">No results</li>
                    <li
                        v-for="(option, index) in results"
                        :key="option.value"
                        class="cursor-pointer px-3 py-1.5 text-sm"
                        :class="index === highlighted ? 'bg-red-50' : 'hover:bg-red-50'"
                        @mouseenter="highlighted = index"
                        @mousedown.prevent="select(option)"
                    >
                        {{ option.label }}
                    </li>
                </ul>
            </Teleport>
        </div>

        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>
