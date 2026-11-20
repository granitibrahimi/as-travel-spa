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
    // One wrapping toolbar row without labels (the board's top bar).
    compact: { type: Boolean, default: false },
});

// Label in the grid layout; in the compact row the placeholder says it instead.
const label = (text) => (props.compact ? '' : text);
const all = (what) => (props.compact ? `All ${what}` : 'All');
// Width of a field in the compact row.
const w = (width) => (props.compact ? width : '');

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
    <form
        :class="compact ? 'flex flex-wrap items-center gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6'"
        @submit.prevent
    >
        <div :class="compact ? 'min-w-[9rem] flex-1' : 'sm:col-span-2'">
            <InputText v-model="f.q" type="search" :label="label('Search')" :placeholder="compact ? 'Search name or phone' : 'Customer name or phone'" autocomplete="off" />
        </div>
        <div v-if="has('status')" :class="w('w-36')">
            <Select v-model="f.status" :label="label('Status')" :options="statusOptions" :placeholder="all('statuses')" />
        </div>
        <div v-if="showAgent && has('assigned_to')" :class="w('w-40')">
            <Select v-model="f.assigned_to" :label="label('Agent')" :options="agentOptions" :placeholder="all('agents')" />
        </div>
        <div :class="w('w-40')">
            <CheckboxDropdown v-model="f.source" :label="label('Source')" :options="sourceOptions" :placeholder="all('sources')">
                <template #option="{ option }">
                    <SourceIcon :source="{ id: option.value, name: option.label }" badge />{{ option.label }}
                </template>
            </CheckboxDropdown>
        </div>
        <div v-if="has('type')" :class="w('w-36')">
            <Select v-model="f.type" :label="label('Type')" :options="typeOptions" :placeholder="all('types')" />
        </div>
        <div :class="w('w-32')">
            <DatePicker v-model="f.date_from" :label="label('From')" :placeholder="compact ? 'From' : 'dd.mm.yyyy'" />
        </div>
        <div :class="w('w-32')">
            <DatePicker v-model="f.date_to" :label="label('To')" :placeholder="compact ? 'To' : 'dd.mm.yyyy'" />
        </div>
        <div v-if="has('spam')" :class="w('w-36')">
            <Select
                v-model="f.spam"
                :label="label('Spam')"
                :options="[{ value: '0', label: 'Hide spam' }, { value: '1', label: 'Only spam' }]"
                :placeholder="compact ? 'With spam' : 'All'"
            />
        </div>
        <div v-if="has('mine')" class="flex items-end" :class="compact ? '' : 'pb-2'">
            <NiceCheckbox v-model="f.mine" label="Assigned to me" />
        </div>
        <div class="flex items-end" :class="compact ? '' : 'pb-0.5'">
            <Button type="button" @click="$emit('clear')">{{ compact ? 'Clear' : 'Clear filters' }}</Button>
        </div>
    </form>
</template>
