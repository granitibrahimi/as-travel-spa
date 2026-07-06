<script setup>
import { inject, ref } from 'vue';
import AsyncSelect from './Form/AsyncSelect.vue';
import AutoGrowTextarea from './Form/Textarea.vue';
import InputNumber from './Form/InputNumber.vue';
import Select from './Form/Select.vue';
import HotelQuickCreate from './HotelQuickCreate.vue';

const props = defineProps({
    rows: { type: Array, required: true },
    // When true the pricing basis is forced to per-unit and can't be changed.
    lockBasis: { type: Boolean, default: false },
    // The destination this section belongs to; hotel lookups are scoped to it.
    destinationId: { type: [Number, String, null], default: null },
    // Destination label used when quick-creating a hotel from a row.
    destinationName: { type: String, default: '' },
});

defineEmits(['remove']);

const meta = inject('offerMeta');

// Hotel popup targets one row at a time; with a hotel id it opens in edit
// mode (e.g. to add a missing room), otherwise it creates a new hotel.
const modalLine = ref(null);
const modalHotelId = ref(null);

// Bumped after a hotel edit so the room selects refetch their lists.
const roomsVersion = ref(0);

function openHotelCreate(line) {
    modalLine.value = line;
    modalHotelId.value = null;
}

function openHotelEdit(line) {
    modalLine.value = line;
    modalHotelId.value = line.hotel_id;
}

function closeHotelModal() {
    modalLine.value = null;
    modalHotelId.value = null;
}

function onHotelCreated(hotel) {
    const line = modalLine.value;

    line.hotel_id = hotel.id;
    line.hotel_name = hotel.title;
    line.room_id = null;
    line.room_type = null;

    closeHotelModal();
}

function onHotelUpdated(hotel) {
    const line = modalLine.value;

    line.hotel_name = hotel.title;
    roomsVersion.value += 1;

    closeHotelModal();
}

function onCategoryChange(line) {
    line.basis = props.lockBasis ? meta.perUnitBasis : (meta.defaultBasis[line.category] ?? line.basis);

    if (line.category !== meta.hotelCategory) {
        line.room_type = null;
        line.meal = '';
        line.hotel_id = null;
        line.room_id = null;
    } else if (line.room_type === null) {
        line.room_type = '';
    }
}

function onSupplierChange(line, option) {
    line.supplier_name = option ? option.label : null;
}

function onHotelChange(line, option) {
    line.hotel_name = option ? option.label : null;

    // Rooms depend on the hotel — reset the room whenever the hotel changes.
    line.room_id = null;
    line.room_type = null;
}

function onRoomChange(line, option) {
    line.room_type = option ? option.label : null;
}
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b text-left text-xs uppercase text-gray-500">
                    <th class="px-2 py-2" style="width: 110px;">Type</th>
                    <th class="px-2 py-2">Description</th>
                    <th class="px-2 py-2" style="width: 180px;">Hotel</th>
                    <th class="px-2 py-2" style="width: 160px;">Room</th>
                    <th class="px-2 py-2" style="width: 90px;">Meal</th>
                    <th class="px-2 py-2" style="width: 180px;">Supplier</th>
                    <th class="px-2 py-2" style="width: 120px;">Basis</th>
                    <th class="px-2 py-2" style="width: 100px;">Price €</th>
                    <th class="px-2 py-2" style="width: 40px;"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(line, i) in rows" :key="i" class="border-b last:border-0 align-top">
                    <td class="px-2 py-2">
                        <Select
                            v-model="line.category"
                            :options="meta.categories"
                            :placeholder="null"
                            @update:model-value="onCategoryChange(line)"
                        />
                    </td>
                    <td class="px-2 py-2">
                        <AutoGrowTextarea v-model="line.description" />
                    </td>
                    <td class="px-2 py-2">
                        <div v-if="line.category === meta.hotelCategory" class="flex items-start gap-1">
                            <AsyncSelect
                                :key="`hotel-${i}-${destinationId}-${line.hotel_id}`"
                                v-model="line.hotel_id"
                                :url="meta.hotelsUrl"
                                label-key="title"
                                :params="destinationId ? { parent_destination_id: destinationId } : {}"
                                :initial-option="line.hotel_id ? { id: line.hotel_id, title: line.hotel_name ?? '' } : null"
                                placeholder="Hotel…"
                                class="flex-1"
                                @change="(option) => onHotelChange(line, option)"
                            />
                            <button
                                type="button"
                                class="mt-1 rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                                title="Create a new hotel"
                                @click="openHotelCreate(line)"
                            >
                                +
                            </button>
                        </div>
                        <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="px-2 py-2">
                        <div v-if="line.category === meta.hotelCategory" class="flex items-start gap-1">
                            <AsyncSelect
                                :key="`room-${i}-${line.hotel_id}-${roomsVersion}`"
                                v-model="line.room_id"
                                :url="meta.roomsUrl"
                                label-key="room"
                                :params="line.hotel_id ? { hotel_id: line.hotel_id } : {}"
                                :disabled="!line.hotel_id"
                                placeholder="Room…"
                                class="flex-1"
                                @change="(option) => onRoomChange(line, option)"
                            />
                            <button
                                v-if="line.hotel_id"
                                type="button"
                                class="mt-1 rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                                title="Add rooms to this hotel"
                                @click="openHotelEdit(line)"
                            >
                                +
                            </button>
                        </div>
                        <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="px-2 py-2">
                        <Select v-if="line.category === meta.hotelCategory" v-model="line.meal" :options="meta.meals" placeholder="—" />
                        <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="px-2 py-2">
                        <span v-if="line.category === meta.serviceCategory" class="text-gray-400">—</span>
                        <AsyncSelect
                            v-else
                            v-model="line.supplier_id"
                            :url="meta.suppliersUrl"
                            :initial-option="line.supplier_id ? { id: line.supplier_id, name: line.supplier_name } : null"
                            placeholder="Supplier…"
                            @change="(option) => onSupplierChange(line, option)"
                        />
                    </td>
                    <td class="px-2 py-2">
                        <Select
                            v-model="line.basis"
                            :options="meta.bases"
                            :placeholder="null"
                            :disabled="lockBasis"
                        />
                    </td>
                    <td class="px-2 py-2">
                        <InputNumber v-model="line.price" min="0" step="0.01" />
                    </td>
                    <td class="px-2 py-2 text-center">
                        <button type="button" class="rounded-md bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100" @click="$emit('remove', i)">✕</button>
                    </td>
                </tr>
            </tbody>
        </table>

        <HotelQuickCreate
            :show="Boolean(modalLine)"
            :destination="destinationId ? { id: destinationId, name: destinationName } : null"
            :base-url="meta.hotelsUrl"
            :hotel-id="modalHotelId"
            @created="onHotelCreated"
            @updated="onHotelUpdated"
            @cancel="closeHotelModal"
        />
    </div>
</template>
