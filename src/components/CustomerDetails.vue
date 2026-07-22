<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routeUrl } from '../helpers/route.js';
import { useAuthStore } from '../stores/auth.js';
import FullWidthBox from './FullWidthBox.vue';

/**
 * Customer details table, shared by the customer show page and any page that
 * embeds customer details (e.g. pro-invoice create). Expects a customer object
 * shaped by the CustomerDetails service.
 *
 * By default it renders inside its own FullWidthBox (titled "Customer") with a
 * "View customer" button (top-right) linking to the customer's show page.
 * - Pass `:boxed="false"` to render just the bare table (when embedding inside
 *   another box, e.g. a payment box or a record-change diff).
 * - Pass `:show-view-link="false"` to hide the button (e.g. on the customer's
 *   own show page, where it would link to itself).
 */
const props = defineProps({
    customer: { type: Object, required: true },
    boxed: { type: Boolean, default: true },
    title: { type: String, default: 'Customer' },
    showViewLink: { type: Boolean, default: true },
});

const auth = useAuthStore();

const rows = computed(() => [
    ['ID', props.customer.id],
    ['Unique ID', props.customer.unique_id],
    ['Type', props.customer.type],
    ['Name', props.customer.full_name],
    ['VAT number', props.customer.vat_nr],
    ['Email', props.customer.email],
    ['Phone', props.customer.phone],
    ['Address', props.customer.address],
    ['Working info', props.customer.working_info],
    ['Due date', props.customer.due_days === null || props.customer.due_days === undefined
        ? null
        : `${props.customer.due_days} → ${props.customer.due_days_type}`],
]);

const canViewCustomer = computed(() =>
    props.showViewLink && props.customer?.id != null && auth.can('customers.show'),
);
</script>

<template>
    <FullWidthBox v-if="boxed" :title="title" :collapsible="false">
        <template v-if="canViewCustomer" #actions>
            <RouterLink
                :to="routeUrl('customers.show', customer.id)"
                class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
                View Customer
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
