<script setup>
import { computed } from 'vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import DatePicker from '../../components/Form/DatePicker.vue';
import CheckboxDropdown from '../../components/Form/CheckboxDropdown.vue';
import SourceIcon from './SourceIcon.vue';

// The request filters shared by the list and the board. `filters` is the
// reactive object from useListFilters; fields missing from it are not shown.
const props = defineProps({
    filters: { type: Object, required: true },
    options: { type: Object, required: true },
    // Show the Agent filter (needs simpleTasks.listAll).
    showAgent: { type: Boolean, default: false },
});

defineEmits(['clear']);

// eslint-disable-next-line vue/no-mutating-props -- the parent hands over its reactive filters on purpose.
const f = props.filters;

const has = (key) => key in f;

const statusOptions = computed(() => [
    { value: 'active', label: 'Active (not finished)' },
    { value: 'finished', label: 'Finished' },
    ...(props.options.statuses ?? []).map((s) => ({ value: String(s.id), label: s.name })),
]);

const agentOptions = computed(() => [
    { value: 'none', label: 'Not assigned' },
    ...(props.options.agents ?? []).map((a) => ({ value: String(a.id), label: a.name })),
]);

const sourceOptions = computed(() => (props.options.sources ?? []).map((s) => ({ value: s.id, label: s.name })));
const typeOptions = computed(() => (props.options.types ?? []).map((t) => ({ value: String(t.id), label: t.name })));
</script>

<template>
    <form class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6" @submit.prevent>
        <div class="sm:col-span-2">
            <InputText v-model="f.q" type="search" label="Search" placeholder="Customer name or phone" autocomplete="off" />
        </div>
        <Select v-if="has('status')" v-model="f.status" label="Status" :options="statusOptions" placeholder="All" />
        <Select v-if="showAgent && has('assigned_to')" v-model="f.assigned_to" label="Agent" :options="agentOptions" placeholder="All" />
        <CheckboxDropdown v-model="f.source" label="Source" :options="sourceOptions">
            <template #option="{ option }">
                <SourceIcon :source="{ id: option.value, name: option.label }" badge />{{ option.label }}
            </template>
        </CheckboxDropdown>
        <Select v-model="f.type" label="Type" :options="typeOptions" placeholder="All" />
        <DatePicker v-model="f.date_from" label="From" />
        <DatePicker v-model="f.date_to" label="To" />
        <Select
            v-model="f.spam"
            label="Spam"
            :options="[{ value: '0', label: 'Hide spam' }, { value: '1', label: 'Only spam' }]"
            placeholder="All"
        />
        <div v-if="has('mine')" class="flex items-end pb-2">
            <NiceCheckbox v-model="f.mine" label="Assigned to me" />
        </div>
        <div class="flex items-end pb-0.5">
            <Button type="button" @click="$emit('clear')">Clear filters</Button>
        </div>
    </form>
</template>
