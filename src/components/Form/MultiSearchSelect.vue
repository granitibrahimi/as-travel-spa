<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

// Several values picked from a local option list: the picks show as removable
// chips, the input filters the rest client-side (no backend calls). The
// dropdown is teleported to <body> like SearchSelect's, so parent overflow
// can't clip it.
const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    // Options as [{ value, label }].
    options: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    error: { type: String, default: '' },
    placeholder: { type: String, default: 'Search…' },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const search = ref('');
const open = ref(false);
const highlighted = ref(-1);
const listRef = ref(null);
const wrapperRef = ref(null);
const dropdownStyle = ref({});
let blurTimer = null;

// Values compared as strings: ones read back from the URL arrive as strings.
const selectedKeys = computed(() => new Set(props.modelValue.map(String)));

const selected = computed(() => props.modelValue.map((value) => (
    props.options.find((option) => String(option.value) === String(value)) ?? { value, label: `#${value}` }
)));

const results = computed(() => {
    const term = search.value.trim().toLowerCase();

    return props.options.filter((option) => ! selectedKeys.value.has(String(option.value))
        && (! term || String(option.label).toLowerCase().includes(term)));
});

function updatePosition() {
    const el = wrapperRef.value;

    if (! el) {
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

watch(search, () => {
    highlighted.value = results.value.length ? 0 : -1;
});

// The chips can wrap onto another line, moving the input.
watch(() => props.modelValue.length, () => {
    if (open.value) {
        requestAnimationFrame(updatePosition);
    }
});

watch(highlighted, (index) => {
    if (index < 0 || ! listRef.value) {
        return;
    }

    listRef.value.children[index]?.scrollIntoView({ block: 'nearest' });
});

function onFocus() {
    clearTimeout(blurTimer);
    open.value = true;
    highlighted.value = results.value.length ? 0 : -1;
}

function onBlur() {
    // Delay so an option click registers before the dropdown closes.
    blurTimer = setTimeout(() => {
        open.value = false;
    }, 150);
}

function add(option) {
    emit('update:modelValue', [...props.modelValue, option.value]);
    search.value = '';
}

function remove(value) {
    emit('update:modelValue', props.modelValue.filter((candidate) => String(candidate) !== String(value)));
}

function onKeydown(event) {
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && ! open.value) {
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
            add(results.value[highlighted.value]);
        }
    } else if (event.key === 'Backspace' && search.value === '' && props.modelValue.length) {
        remove(props.modelValue[props.modelValue.length - 1]);
    } else if (event.key === 'Escape') {
        open.value = false;
    }
}

onBeforeUnmount(() => {
    clearTimeout(blurTimer);
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
});
</script>

<template>
    <div>
        <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>

        <div
            ref="wrapperRef"
            class="flex min-h-[2.375rem] w-full flex-wrap items-center gap-1 rounded border bg-white px-1.5 py-1 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
            :class="[error ? 'border-red-500' : 'border-gray-300', disabled ? 'bg-gray-100' : '']"
        >
            <span
                v-for="option in selected"
                :key="option.value"
                class="inline-flex items-center gap-1 rounded bg-gray-100 py-0.5 pl-2 pr-1 text-sm text-gray-700"
            >
                {{ option.label }}
                <button
                    v-if="! disabled"
                    type="button"
                    class="px-0.5 text-gray-400 hover:text-gray-700"
                    tabindex="-1"
                    :aria-label="`Remove ${option.label}`"
                    @click="remove(option.value)"
                >
                    ×
                </button>
            </span>

            <input
                v-model="search"
                type="text"
                :placeholder="selected.length ? '' : placeholder"
                :disabled="disabled"
                autocomplete="off"
                role="combobox"
                :aria-expanded="open"
                class="min-w-[6rem] flex-1 border-0 bg-transparent px-1.5 py-0.5 text-base font-normal leading-normal focus:outline-none focus:ring-0"
                @focus="onFocus"
                @blur="onBlur"
                @keydown="onKeydown"
            >
        </div>

        <Teleport to="body">
            <ul
                v-if="open"
                ref="listRef"
                :style="dropdownStyle"
                class="z-50 max-h-56 overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg"
            >
                <li v-if="results.length === 0" class="px-3 py-1.5 text-sm text-gray-400">No results</li>
                <li
                    v-for="(option, index) in results"
                    :key="option.value"
                    class="cursor-pointer px-3 py-1.5 text-sm"
                    :class="index === highlighted ? 'bg-red-50' : 'hover:bg-red-50'"
                    @mouseenter="highlighted = index"
                    @mousedown.prevent="add(option)"
                >
                    {{ option.label }}
                </li>
            </ul>
        </Teleport>

        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </div>
</template>
