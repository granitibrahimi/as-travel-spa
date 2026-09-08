<script setup>
/**
 * Navigation command palette: double-tap Ctrl (see useDoubleTap), or press
 * Cmd/Ctrl+K, to open a jump-to box that filters every sidebar entry the user
 * can access (layout.allNavItems, permission-filtered) and routes straight to
 * the pick. Complements GlobalSearch.vue (double-Shift → Algolia records) —
 * this one searches the app's own navigation, not data.
 *
 * Inert while the user isn't signed in.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useLayoutStore } from '../stores/layout';
import { useDoubleTap } from '../composables/useDoubleTap';

const auth = useAuthStore();
const layout = useLayoutStore();
const router = useRouter();

const open = ref(false);
const query = ref('');
const inputRef = ref(null);
const highlighted = ref(0);
const resultRefs = ref([]);

// Fuzzy-ish: every whitespace-separated token must appear (case-insensitive)
// somewhere in the item's label / group / workspace. Empty query lists all.
const results = computed(() => {
    const tokens = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const items = layout.allNavItems;

    if (!tokens.length) {
        return items.slice(0, 50);
    }

    return items
        .filter((item) => {
            const haystack = `${item.label} ${item.group} ${item.workspace}`.toLowerCase();

            return tokens.every((token) => haystack.includes(token));
        })
        .slice(0, 50);
});

useDoubleTap('Control', () => {
    if (auth.sessionActive) {
        toggle();
    }
});

function toggle() {
    if (open.value) {
        close();
    } else {
        openPalette();
    }
}

function openPalette() {
    open.value = true;
    query.value = '';
    highlighted.value = 0;
    nextTick(() => inputRef.value?.focus());
}

function close() {
    open.value = false;
    query.value = '';
}

function select(item) {
    close();

    if (!item) {
        return;
    }

    if (item.workspaceKey && item.workspaceKey !== layout.activeWorkspace) {
        layout.switchWorkspace(item.workspaceKey);
    }

    router.push(item.to);
}

function move(delta) {
    const count = results.value.length;

    if (!count) {
        return;
    }

    highlighted.value = (highlighted.value + delta + count) % count;
}

// Keep the highlight in view as it moves past the visible edge of the list.
watch(highlighted, (index) => {
    nextTick(() => resultRefs.value[index]?.scrollIntoView({ block: 'nearest' }));
});

// Reset the highlight to the top whenever the filtered set changes; drop any
// stale element refs from a longer previous list.
watch(results, () => {
    highlighted.value = 0;
    resultRefs.value = [];
});

// Cmd/Ctrl+K is bound at the document level so it opens the palette from
// anywhere; Escape / arrows / Enter are handled on the input while open.
function onDocKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        if (!auth.sessionActive) {
            return;
        }

        event.preventDefault();
        toggle();
    }
}

function onInputKeydown(event) {
    if (event.key === 'Escape') {
        close();
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(1);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(-1);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        select(results.value[highlighted.value]);
    }
}

onMounted(() => document.addEventListener('keydown', onDocKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onDocKeydown));
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-[60] flex justify-center overflow-y-auto p-4 pt-[10vh]"
            role="dialog"
            aria-modal="true"
        >
            <div class="absolute inset-0 bg-black/50" @click="close" />

            <div class="relative w-full max-w-xl">
                <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xl">
                    <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" />
                        <path stroke-linecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        ref="inputRef"
                        v-model="query"
                        type="text"
                        placeholder="Jump to a page…"
                        class="w-full border-0 p-0 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                        @keydown="onInputKeydown"
                    >
                </div>

                <div class="mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                    <p v-if="!results.length" class="p-2 text-sm text-gray-400">No pages match "{{ query }}".</p>

                    <button
                        v-for="(item, index) in results"
                        :key="item.to"
                        :ref="(el) => (resultRefs[index] = el)"
                        type="button"
                        class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm"
                        :class="index === highlighted ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-50'"
                        @click="select(item)"
                        @mousemove="highlighted = index"
                    >
                        <span class="min-w-0 flex-1 truncate font-medium">{{ item.label }}</span>
                        <span class="shrink-0 text-xs text-gray-400">{{ item.workspace }} <span class="text-gray-300">/</span> {{ item.group }}</span>
                    </button>
                </div>

                <p class="mt-2 text-center text-xs text-gray-300">
                    <kbd class="rounded border border-gray-300 px-1 text-gray-400">↑</kbd>
                    <kbd class="rounded border border-gray-300 px-1 text-gray-400">↓</kbd> to navigate ·
                    <kbd class="rounded border border-gray-300 px-1 text-gray-400">Enter</kbd> to open ·
                    <kbd class="rounded border border-gray-300 px-1 text-gray-400">Esc</kbd> to close
                </p>
            </div>
        </div>
    </Teleport>
</template>
