<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable journal actions side overlay. Actions are defined here (not served
// by the API) and shown only when the user holds the action's permission —
// mirrors src/pages/Suppliers/Suppliers/Actions.vue. A QB-synced row can offer
// up to five actions (View, Edit, Clone, QB, Delete), which is why the list
// uses this overlay rather than the ⋯ dropdown (see CLAUDE.md).
const props = defineProps({
    // The journal whose actions are shown (null = nothing selected).
    journal: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();

// Grouped, permission-filtered actions. Each item is a link (`to`), an external
// link (`href`) or a local handler (`action`, e.g. delete). Empty groups drop.
const groups = computed(() => {
    const journal = props.journal;

    if (! journal) {
        return [];
    }

    // "Clone" opens the create form pre-filled from this journal (?clone=<id>);
    // it POSTs a brand-new journal on submit.
    const pages = [
        ...(props.showViewAction ? [{ label: 'View', to: routeUrl('journals.show', journal.id), can: 'journals.show' }] : []),
        { label: 'Edit', to: routeUrl('journals.edit', journal.id), can: 'journals.edit' },
        { label: 'Clone', to: routeUrl('journals.create', { clone: journal.id }), can: 'journals.create' },
    ].filter((action) => auth.can(action.can));

    const other = [];

    if (auth.can('journals.delete')) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = journal) });
    }

    if (journal.qb_link) {
        other.push({ label: 'Open in QuickBooks', href: journal.qb_link, external: true });
    }

    return [
        ...(pages.length ? [{ label: 'Pages', items: pages }] : []),
        ...(other.length ? [{ label: null, items: other }] : []),
    ];
});

// Local delete flow (confirm dialog → API). The parent decides what happens
// after (the list refetches) via `deleted`.
const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value || ! toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        const removed = toDelete.value;
        await api.delete(`/finance/journals/${removed.id}`);
        toDelete.value = null;
        emit('deleted', removed);
        emit('close');
    } finally {
        deleting.value = false;
    }
}

const linkClass = 'block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50';
const dangerClass = 'block w-full rounded border border-red-200 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50';
</script>

<template>
    <ActionsOverlay
        :show="show"
        :title="journal ? `Journal ${journal.gen_id}` : ''"
        :subtitle="journal ? `#${journal.id}` : ''"
        @close="emit('close')"
    >
        <div v-if="journal" class="space-y-5">
            <div v-for="(group, i) in groups" :key="i">
                <p v-if="group.label" class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ group.label }}</p>
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <a
                            v-if="action.href"
                            :href="action.href"
                            target="_blank"
                            rel="noopener"
                            :class="linkClass"
                        >
                            {{ action.label }} <span class="text-gray-400">↗</span>
                        </a>
                        <RouterLink v-else-if="action.to" :to="action.to" :class="linkClass">
                            {{ action.label }}
                        </RouterLink>
                        <button v-else type="button" :class="dangerClass" @click="action.action">
                            {{ action.label }}
                        </button>
                    </template>
                </div>
            </div>

            <p v-if="groups.length === 0" class="text-sm text-gray-400">No actions available.</p>
        </div>
    </ActionsOverlay>

    <ConfirmDialog
        :show="Boolean(toDelete)"
        title="Delete journal?"
        :message="toDelete ? `${toDelete.gen_id} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
