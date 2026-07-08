<script setup>
/**
 * Shared filter bar for the statistics reports: an ISO date range plus an
 * optional parent-destination scope. Emits `apply` with the filter params
 * (undefined for blanks) — once on mount with the defaults, then on each click.
 */
import { onMounted, ref } from 'vue';
import Button from './Button.vue';
import InputText from './Form/InputText.vue';
import AsyncSelect from './Form/AsyncSelect.vue';

const props = defineProps({
    showDestination: { type: Boolean, default: true },
    monthsBack: { type: Number, default: 12 },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['apply']);

// Parent-destination lookup lives under /api/customers, a sibling of the api
// client's /api/v1 base, so it uses an absolute URL (mirrors Invoices/Due.vue).
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const parentDestinationsUrl = `${apiOrigin}/api/customers/destinations`;

function isoDaysFromMonths(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months, 1);

    return date.toISOString().slice(0, 10);
}

const from = ref(isoDaysFromMonths(props.monthsBack));
const to = ref(new Date().toISOString().slice(0, 10));
const parentDestinationId = ref(null);

function apply() {
    emit('apply', {
        from: from.value || undefined,
        to: to.value || undefined,
        parent_destination_id: parentDestinationId.value || undefined,
    });
}

onMounted(apply);
</script>

<template>
    <div class="flex flex-wrap items-end gap-3">
        <InputText v-model="from" type="date" label="From" />
        <InputText v-model="to" type="date" label="To" />
        <AsyncSelect
            v-if="showDestination"
            v-model="parentDestinationId"
            :url="parentDestinationsUrl"
            label="Parent Destination"
            placeholder="All destinations"
            class="min-w-[200px]"
        />
        <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
    </div>
</template>
