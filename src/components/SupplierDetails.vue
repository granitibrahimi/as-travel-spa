<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routeUrl } from '../helpers/route.js';
import { useAuthStore } from '../stores/auth.js';
import FullWidthBox from './FullWidthBox.vue';

/**
 * Supplier details table, shared by the supplier show page and any page that
 * embeds supplier details (e.g. a payment/deposit/gift-card/refund box).
 * Expects a supplier object shaped by the SupplierDetails service.
 *
 * By default it renders inside its own FullWidthBox (titled "Supplier") with a
 * "View Supplier" button (top-right) linking to the supplier's show page.
 * - Pass `:boxed="false"` to render just the bare table (when embedding inside
 *   another box, e.g. a payment box or a record-change diff).
 * - Pass `:show-view-link="false"` to hide the button (e.g. on the supplier's
 *   own show page, where it would link to itself).
 */
const props = defineProps({
    supplier: { type: Object, required: true },
    boxed: { type: Boolean, default: true },
    title: { type: String, default: 'Supplier' },
    showViewLink: { type: Boolean, default: true },
});

const auth = useAuthStore();

const rows = computed(() => [
    ['ID', props.supplier.id],
    ['Unique ID', props.supplier.unique_id],
    ['VAT number', props.supplier.vat_nr],
    ['Name', props.supplier.full_name ?? props.supplier.name],
    ['Email', props.supplier.email],
    ['Phone', props.supplier.phone],
    ['Address', props.supplier.address],
    ['Bill due date', props.supplier.due_days === null || props.supplier.due_days === undefined
        ? null
        : `${props.supplier.due_days} → ${props.supplier.due_days_type}`],
]);

const canViewSupplier = computed(() =>
    props.showViewLink && props.supplier?.id != null && auth.can('suppliers.show'),
);
</script>

<template>
    <FullWidthBox v-if="boxed" :title="title" :collapsible="false">
        <template v-if="canViewSupplier" #actions>
            <RouterLink
                :to="routeUrl('suppliers.show', supplier.id)"
                class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
                View Supplier
            </RouterLink>
        </template>

        <table class="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
                <tr v-for="[label, value] in rows" :key="label">
                    <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                    <td class="border border-gray-300 px-2 py-2">{{ value ?? '-' }}</td>
                </tr>
            </tbody>
        </table>
    </FullWidthBox>

    <table v-else class="w-full border-collapse border border-gray-300 text-sm">
        <tbody>
            <tr v-for="[label, value] in rows" :key="label">
                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                <td class="border border-gray-300 px-2 py-2">{{ value ?? '-' }}</td>
            </tr>
        </tbody>
    </table>
</template>
