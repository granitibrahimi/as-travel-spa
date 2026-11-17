<script setup>
// "Destinations" box on the request form: several parent destinations
// (picked one after the other) and the Combo checkbox.
import { getParentDestinationsAutosuggestEndpoint } from '../../helpers/api';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';

const destinations = defineModel('destinations', { type: Array, default: () => [] }); // [{ id, name }]
const combo = defineModel('combo', { type: Boolean, default: false });

defineProps({
    errors: { type: Object, default: () => ({}) },
});

function add(option) {
    if (! option || destinations.value.some((d) => d.id === option.value)) {
        return;
    }
    destinations.value = [...destinations.value, { id: option.value, name: option.label }];
}

function remove(id) {
    destinations.value = destinations.value.filter((d) => d.id !== id);
}

function destinationError(errors) {
    const key = Object.keys(errors).find((field) => field.startsWith('parent_destination'));
    return key ? errors[key] : '';
}
</script>

<template>
    <fieldset class="rounded-lg border border-gray-300 px-4 pb-4 pt-2">
        <legend class="px-1 text-xs font-semibold uppercase text-gray-600">Destinations</legend>

        <div class="space-y-3">
            <AsyncSelect
                label="Add destination"
                :url="getParentDestinationsAutosuggestEndpoint()"
                placeholder="Search for a destination…"
                :error="destinationError(errors)"
                clear-on-select
                @change="add"
            />

            <ul v-if="destinations.length" class="flex flex-wrap gap-2">
                <li
                    v-for="destination in destinations"
                    :key="destination.id"
                    class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 py-1 pl-3 pr-1 text-sm"
                >
                    {{ destination.name }}
                    <button
                        type="button"
                        class="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                        :title="`Remove ${destination.name}`"
                        @click="remove(destination.id)"
                    >×</button>
                </li>
            </ul>
            <p v-else class="text-xs text-gray-400">No destination yet. Add as many as the customer mentions.</p>

            <NiceCheckbox v-model="combo" label="Combo" :error="errors.combo" />
        </div>
    </fieldset>
</template>
