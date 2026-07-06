<script setup>
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import Button from './Button.vue';
import InputText from './Form/InputText.vue';
import InputNumber from './Form/InputNumber.vue';
import StarRating from './StarRating.vue';

const props = defineProps({
    show: { type: Boolean, default: false },
    // The destination the hotel belongs to (prefilled, not editable here).
    destination: { type: Object, default: null }, // { id, name }
    // Hotels API base URL: POST for create, GET/PUT `${baseUrl}/{id}` for edit.
    baseUrl: { type: String, required: true },
    // When set the popup edits this hotel (e.g. to add missing rooms).
    hotelId: { type: [Number, null], default: null },
});

const emit = defineEmits(['created', 'updated', 'cancel']);

const isEdit = computed(() => Boolean(props.hotelId));

const title = ref('');
const stars = ref(0);
const link = ref('');
const rooms = ref([]);
const errors = ref({});
const saving = ref(false);
const loading = ref(false);

const blankRoom = () => ({ id: null, room: '', max_occupancy: 2, max_adults: 2, max_children: 0 });

const addRoom = () => rooms.value.push(blankRoom());
const removeRoom = (index) => rooms.value.splice(index, 1);

watch(() => props.show, (open) => {
    if (!open) {
        document.removeEventListener('keydown', onKeydown);
        return;
    }

    title.value = '';
    stars.value = 0;
    link.value = '';
    rooms.value = [blankRoom()];
    errors.value = {};
    document.addEventListener('keydown', onKeydown);

    if (isEdit.value) {
        loading.value = true;

        axios.get(`${props.baseUrl}/${props.hotelId}`, { withCredentials: true })
            .then(({ data }) => {
                title.value = data.title ?? '';
                stars.value = data.stars ?? 0;
                link.value = data.link ?? '';
                rooms.value = (data.rooms ?? []).map((room) => ({ ...room }));
            })
            .finally(() => {
                loading.value = false;
            });
    }
});

function onKeydown(event) {
    if (event.key === 'Escape' && !saving.value) {
        emit('cancel');
    }
}

function submit() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    errors.value = {};

    const payload = {
        title: title.value,
        parent_destination_id: props.destination?.id,
        stars: stars.value,
        link: link.value || null,
        rooms: rooms.value,
    };

    const request = isEdit.value
        ? axios.put(`${props.baseUrl}/${props.hotelId}`, payload, { withCredentials: true })
        : axios.post(props.baseUrl, payload, { withCredentials: true });

    request
        .then(({ data }) => emit(isEdit.value ? 'updated' : 'created', data))
        .catch((error) => {
            errors.value = error.response?.data?.errors ?? { title: ['Could not save the hotel.'] };
        })
        .finally(() => {
            saving.value = false;
        });
}

// "rooms.0.room" style errors → shown under the matching row input.
const roomError = (index, field) => errors.value[`rooms.${index}.${field}`]?.[0];
</script>

<template>
    <Teleport to="body">
        <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/50" @click="!saving && $emit('cancel')" />

            <div
                role="dialog"
                aria-modal="true"
                class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            >
                <h3 class="text-lg font-semibold text-gray-900">{{ isEdit ? 'Edit hotel' : 'New hotel' }}</h3>
                <p v-if="destination" class="mt-1 text-sm text-gray-500">
                    Destination: <span class="font-medium text-gray-700">{{ destination.name }}</span>
                </p>

                <p v-if="loading" class="mt-6 text-sm text-gray-400">Loading hotel…</p>

                <template v-else>
                    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputText v-model="title" label="Title *" :error="errors.title?.[0]" />

                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">Rating *</label>
                            <StarRating v-model="stars" />
                            <p v-if="errors.stars" class="mt-1 text-xs text-red-600">{{ errors.stars[0] }}</p>
                        </div>

                        <div class="md:col-span-2">
                            <InputText v-model="link" label="Link" :error="errors.link?.[0]" />
                        </div>
                    </div>

                    <p v-if="errors.parent_destination_id" class="mt-2 text-xs text-red-600">{{ errors.parent_destination_id[0] }}</p>

                    <!-- Rooms -->
                    <div class="mb-2 mt-6 flex items-center justify-between">
                        <h4 class="text-sm font-semibold uppercase text-gray-500">Rooms</h4>
                        <Button size="sm" @click="addRoom">+ Add room</Button>
                    </div>

                    <p v-if="rooms.length === 0" class="text-sm text-gray-400">No rooms yet.</p>

                    <div class="overflow-x-auto">
                        <table v-if="rooms.length" class="w-full text-sm">
                            <thead>
                                <tr class="border-b text-left text-xs uppercase text-gray-500">
                                    <th class="px-1 py-1">Room</th>
                                    <th class="px-1 py-1" style="width: 120px;">Max occupancy</th>
                                    <th class="px-1 py-1" style="width: 120px;">Max adults</th>
                                    <th class="px-1 py-1" style="width: 120px;">Max children</th>
                                    <th class="px-1 py-1" style="width: 40px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(room, i) in rooms" :key="i" class="border-b align-top last:border-0">
                                    <td class="px-1 py-2">
                                        <InputText v-model="room.room" :error="roomError(i, 'room')" />
                                    </td>
                                    <td class="px-1 py-2">
                                        <InputNumber v-model="room.max_occupancy" min="1" :error="roomError(i, 'max_occupancy')" />
                                    </td>
                                    <td class="px-1 py-2">
                                        <InputNumber v-model="room.max_adults" min="1" :error="roomError(i, 'max_adults')" />
                                    </td>
                                    <td class="px-1 py-2">
                                        <InputNumber v-model="room.max_children" min="0" :error="roomError(i, 'max_children')" />
                                    </td>
                                    <td class="px-1 py-2 text-center">
                                        <Button variant="danger" size="sm" @click="removeRoom(i)">✕</Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                        <Button :disabled="saving" @click="$emit('cancel')">Cancel</Button>
                        <Button variant="primary" :disabled="saving" @click="submit">
                            {{ saving ? 'Saving…' : (isEdit ? 'Update hotel' : 'Create hotel') }}
                        </Button>
                    </div>
                </template>
            </div>
        </div>
    </Teleport>
</template>
