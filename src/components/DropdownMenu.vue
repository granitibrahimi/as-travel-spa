<script setup>
import { ref, onBeforeUnmount } from 'vue';

defineProps({
    /**
     * Menu entries: { label, href?, action?, danger? }.
     * `href` renders a link; `action` is called on click.
     */
    items: { type: Array, required: true },
});

const open = ref(false);
const triggerRef = ref(null);
const menuStyle = ref({});

function close() {
    open.value = false;
    document.removeEventListener('mousedown', onDocumentClick);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', close, true);
}

function toggle() {
    if (open.value) {
        close();
        return;
    }

    const rect = triggerRef.value.getBoundingClientRect();

    // Teleported to <body>, positioned under the trigger, right-aligned.
    menuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
    };

    open.value = true;
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('scroll', close, true);
}

function onDocumentClick(event) {
    if (!triggerRef.value?.contains(event.target)) {
        close();
    }
}

function onKeydown(event) {
    if (event.key === 'Escape') {
        close();
    }
}

function select(item) {
    close();
    item.action?.();
}

onBeforeUnmount(close);
</script>

<template>
    <div class="inline-block">
        <button
            ref="triggerRef"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            :aria-expanded="open"
            @click="toggle"
        >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
            </svg>
        </button>

        <Teleport to="body">
            <div
                v-if="open"
                :style="menuStyle"
                class="z-50 min-w-[180px] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                @mousedown.stop
            >
                <template v-for="(item, i) in items" :key="i">
                    <a
                        v-if="item.href"
                        :href="item.href"
                        class="block px-4 py-1.5 text-sm hover:bg-gray-50"
                        :class="item.danger ? 'text-red-600' : 'text-gray-700'"
                    >
                        {{ item.label }}
                    </a>
                    <button
                        v-else
                        type="button"
                        class="block w-full px-4 py-1.5 text-left text-sm hover:bg-gray-50"
                        :class="item.danger ? 'text-red-600' : 'text-gray-700'"
                        @click="select(item)"
                    >
                        {{ item.label }}
                    </button>
                </template>
            </div>
        </Teleport>
    </div>
</template>
