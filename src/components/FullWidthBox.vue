<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    // Whether the box can be collapsed via the header toggle.
    collapsible: {
        type: Boolean,
        default: true,
    },
    // Initial collapsed state.
    defaultCollapsed: {
        type: Boolean,
        default: false,
    },
    // Optional external control: when set (true/false) the box follows it,
    // while the header toggle still works in between changes.
    collapsed: {
        type: Boolean,
        default: null,
    },
});

const open = ref(props.collapsed !== null ? !props.collapsed : !props.defaultCollapsed);

watch(() => props.collapsed, (value) => {
    if (value !== null) {
        open.value = !value;
    }
});

function toggle() {
    if (props.collapsible) {
        open.value = !open.value;
    }
}
</script>

<template>
    <section class="rounded-lg border border-gray-200 bg-white shadow-lg">
        <header
            class="flex items-center justify-between gap-4 px-6 py-4"
            :class="{ 'border-b border-gray-200': open, 'cursor-pointer': collapsible }"
            @click="toggle"
        >
            <div class="flex items-center gap-2">
                <button
                    v-if="collapsible"
                    type="button"
                    class="text-gray-400 transition-transform hover:text-gray-600"
                    :class="open ? 'rotate-0' : '-rotate-90'"
                    @click.stop="toggle"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
                <slot name="title" />
            </div>

            <div v-if="$slots.actions" class="flex items-center gap-2" @click.stop>
                <slot name="actions" />
            </div>
        </header>

        <div v-show="open">
            <div class="px-6 py-4">
                <slot />
            </div>

            <footer
                v-if="$slots.footer"
                class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3"
            >
                <slot name="footer" />
            </footer>
        </div>
    </section>
</template>
