<script setup>
/**
 * Standard show-page header actions: a "Back to <list>" link next to a ⋯ menu.
 * Following the list-view convention, up to 4 actions render in the DropdownMenu
 * popup; more than 4 open the right-side aside overlay instead.
 *
 * Each action item is { label, to?, href?, action?, danger? }:
 *   - `to`     internal route (RouterLink) — a path string or a named route
 *              object ({ name, params })
 *   - `href`   external URL (opens a new tab)
 *   - `action` a local handler (destructive ones open their own ConfirmDialog)
 */
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import DropdownMenu from './DropdownMenu.vue';
import SideOverlay from './SideOverlay.vue';

const props = defineProps({
    items: { type: Array, default: () => [] },
    backTo: { type: String, default: '' },
    backLabel: { type: String, default: 'Back' },
    // Title/subtitle for the aside overlay header (>4 actions).
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
});

const useAside = computed(() => props.items.length > 4);

// DropdownMenu takes { label, to?, href?, action?, danger? }: `to` for internal
// routes (path or named-route object), `href` for external URLs.
const dropdownItems = computed(() => props.items.map((item) => ({
    label: item.label,
    to: item.to,
    href: item.href,
    action: item.action,
    danger: item.danger,
})));

const open = ref(false);

const isExternal = (item) => item.href && ! item.to;
const linkClass = 'block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50';
const dangerClass = 'block w-full rounded border border-red-200 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50';

function run(item) {
    open.value = false;
    item.action?.();
}
</script>

<template>
    <div class="flex items-center gap-2">
        <RouterLink
            v-if="backTo"
            :to="backTo"
            class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
            ← {{ backLabel }}
        </RouterLink>

        <template v-if="items.length">
            <DropdownMenu v-if="! useAside" :items="dropdownItems" />

            <template v-else>
                <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    aria-label="Actions"
                    @click="open = true"
                >
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="12" cy="19" r="1.8" />
                    </svg>
                </button>

                <SideOverlay :show="open" :title="title" :subtitle="subtitle" @close="open = false">
                    <div class="space-y-1.5">
                        <template v-for="item in items" :key="item.label">
                            <a v-if="isExternal(item)" :href="item.href" target="_blank" rel="noopener" :class="linkClass">
                                {{ item.label }} <span class="text-gray-400">↗</span>
                            </a>
                            <RouterLink v-else-if="item.to" :to="item.to" :class="linkClass" @click="open = false">
                                {{ item.label }}
                            </RouterLink>
                            <button v-else type="button" :class="item.danger ? dangerClass : linkClass" @click="run(item)">
                                {{ item.label }}
                            </button>
                        </template>
                    </div>
                </SideOverlay>
            </template>
        </template>
    </div>
</template>
