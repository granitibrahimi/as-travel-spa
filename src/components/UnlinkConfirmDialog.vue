<script setup>
import { computed } from 'vue';
import Alert from './Alert.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { routeUrl } from '../helpers/route.js';

/**
 * The confirm popup for unlinking a transaction link. A payment link is
 * unlinked on its own (`message` describes it). A link that belongs to a
 * reconciliation (`link.reconciliation_id`) can't be: the API undoes the
 * whole reconciliation, so the popup says so and links to the reconciliation,
 * in a new tab, to see everything it connects.
 */
const props = defineProps({
    // The link to unlink; the dialog is open while it is set.
    link: { type: Object, default: null },
    // 'customer' | 'supplier': whose reconciliation page to link to.
    party: { type: String, required: true },
    message: { type: String, default: '' },
    processing: { type: Boolean, default: false },
    // Off on the reconciliation's own page.
    showReconciliationLink: { type: Boolean, default: true },
});

defineEmits(['confirm', 'cancel']);

const reconciliationId = computed(() => props.link?.reconciliation_id ?? null);

const reconciliationUrl = computed(() => (reconciliationId.value
    ? routeUrl(props.party === 'supplier' ? 'supplierReconciliations.show' : 'customerReconciliations.show', reconciliationId.value)
    : null));
</script>

<template>
    <ConfirmDialog
        :show="Boolean(link)"
        :title="reconciliationId ? 'Delete the entire reconciliation?' : 'Unlink transaction?'"
        :message="reconciliationId ? '' : message"
        :confirm-label="reconciliationId ? 'Yes, delete reconciliation' : 'Yes, unlink'"
        confirm-variant="danger"
        :processing="processing"
        @confirm="$emit('confirm')"
        @cancel="$emit('cancel')"
    >
        <Alert v-if="reconciliationId" type="warning" class="mt-3 space-y-2">
            <p>
                This transaction is part of reconciliation #{{ reconciliationId }}. Unlinking it deletes the
                entire reconciliation: every transaction in it is unlinked and gets its open amount back.
            </p>
            <a
                v-if="showReconciliationLink"
                :href="reconciliationUrl"
                target="_blank"
                rel="noopener"
                class="inline-block font-medium text-red-600 hover:underline"
            >
                See what reconciliation #{{ reconciliationId }} connects ↗
            </a>
        </Alert>
    </ConfirmDialog>
</template>
