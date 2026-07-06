<script setup>
import { computed } from 'vue';

/**
 * Customer details table, shared by the customer show page and any page that
 * embeds customer details (e.g. pro-invoice create). Expects a customer object
 * shaped by the CustomerDetails service.
 */
const props = defineProps({
    customer: { type: Object, required: true },
});

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
</script>

<template>
    <table class="w-full border-collapse border border-gray-300 text-sm">
        <tbody>
            <tr v-for="[label, value] in rows" :key="label">
                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                <td class="border border-gray-300 px-2 py-2">{{ value ?? '-' }}</td>
            </tr>
        </tbody>
    </table>
</template>
