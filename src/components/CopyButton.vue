<script setup>
import { ref } from 'vue';

// Small "copy to clipboard" button: swaps to a green check + "Copied" for a
// moment after a successful copy, then reverts. Used anywhere a value (a
// URL, username, password, …) needs a quick copy affordance next to it.
const props = defineProps({
    value: { type: String, default: '' },
});

const copied = ref(false);
let timer = null;

async function copy() {
    if (!props.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(props.value);
        copied.value = true;
        clearTimeout(timer);
        timer = setTimeout(() => (copied.value = false), 1500);
    } catch {
        // Clipboard API unavailable/denied — nothing sensible to do but leave
        // the value visible for a manual select-and-copy.
    }
}
</script>

<template>
    <button
        type="button"
        class="inline-flex items-center gap-1 text-xs hover:text-gray-800"
        :class="copied ? 'text-green-600' : 'text-gray-500'"
        @click="copy"
    >
        <svg v-if="copied" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="11" height="11" rx="1.5" />
            <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
        </svg>
        {{ copied ? 'Copied' : 'Copy' }}
    </button>
</template>
