<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import InputText from '../../components/Form/InputText.vue';
import InputNumber from '../../components/Form/InputNumber.vue';
import StarRating from '../../components/StarRating.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

// The parent-destination lookup lives under /api/customers (sibling of /api/v1,
// the api client's base) so it's addressed with an absolute URL off the same origin.
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const destinationsUrl = `${apiOrigin}/api/customers/destinations`;

const form = reactive({
    title: '',
    parent_destination_id: null,
    link: '',
    stars: 0,
    min_age_allowed: null,
    infant_max_age: null,
    child_max_age: null,
    rooms: [],
});
const destinationInitial = ref(null);
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/hotels/${id}`);
        const hotel = data.data ?? data;
        Object.assign(form, {
            title: hotel.title ?? '',
            parent_destination_id: hotel.parent_destination_id ?? null,
            link: hotel.link ?? '',
            stars: hotel.stars ?? 0,
            min_age_allowed: hotel.min_age_allowed ?? null,
            infant_max_age: hotel.infant_max_age ?? null,
            child_max_age: hotel.child_max_age ?? null,
            rooms: (hotel.rooms ?? []).map((room) => ({ ...room })),
        });
        destinationInitial.value = hotel.parent_destination ?? null;
    }
});

const addRoom = () => form.rooms.push({
    id: null,
    room: '',
    max_occupancy: 2,
    max_adults: 2,
    max_children: 0,
});
const removeRoom = (index) => form.rooms.splice(index, 1);

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/hotels/${id}`, form) : api.post('/hotels', form));
        router.push('/hotels');
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit hotel' : 'New hotel'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Hotel details">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.title" label="Title *" :error="errors.title" />

                    <AsyncSelect
                        v-model="form.parent_destination_id"
                        :url="destinationsUrl"
                        :initial-option="destinationInitial"
                        label="Destination *"
                        placeholder="Choose destination…"
                        :error="errors.parent_destination_id"
                    />

                    <InputText v-model="form.link" label="Link" :error="errors.link" />

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Rating</label>
                        <StarRating v-model="form.stars" class="mt-1" />
                        <p v-if="errors.stars" class="mt-1 text-xs text-red-600">{{ errors.stars }}</p>
                    </div>
                </div>

                <h3 class="mb-3 mt-6 text-sm font-semibold uppercase text-gray-500">Age categories</h3>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputNumber v-model="form.min_age_allowed" label="Minimum age allowed" min="0" />
                    <InputNumber v-model="form.infant_max_age" label="Infant (0 ⇒ *)" min="0" />
                    <InputNumber v-model="form.child_max_age" label="Children (Infant + 1 ⇒ *)" min="0" />
                </div>
                <div class="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Age is calculated automatically.
                    <strong>Infant</strong>: 0 – specified age.
                    <strong>Children</strong>: infant age – specified age.
                    <strong>Adult</strong>: &gt; children age.
                </div>
            </FullWidthBox>

            <FullWidthBox title="Rooms">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-xs uppercase text-gray-500">
                                <th class="px-2 py-2">Room</th>
                                <th class="px-2 py-2" style="width: 150px;">Max occupancy</th>
                                <th class="px-2 py-2" style="width: 150px;">Max adults</th>
                                <th class="px-2 py-2" style="width: 150px;">Max children</th>
                                <th class="px-2 py-2" style="width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="form.rooms.length === 0">
                                <td colspan="5" class="px-2 py-3 text-center text-gray-400">No rooms yet.</td>
                            </tr>
                            <tr v-for="(room, i) in form.rooms" :key="i" class="border-b last:border-0 align-top">
                                <td class="px-2 py-2">
                                    <InputText v-model="room.room" :error="errors[`rooms.${i}.room`]" />
                                </td>
                                <td class="px-2 py-2">
                                    <InputNumber v-model="room.max_occupancy" min="1" />
                                </td>
                                <td class="px-2 py-2">
                                    <InputNumber v-model="room.max_adults" min="1" />
                                </td>
                                <td class="px-2 py-2">
                                    <InputNumber v-model="room.max_children" min="0" />
                                </td>
                                <td class="px-2 py-2 text-center">
                                    <button type="button" class="rounded bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100" @click="removeRoom(i)">✕</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <template #footer>
                    <button type="button" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50" @click="addRoom">+ Add room</button>
                </template>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/hotels" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <button
                    type="submit"
                    :disabled="processing"
                    class="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                    {{ processing ? 'Saving…' : (isEdit ? 'Update hotel' : 'Create hotel') }}
                </button>
            </footer>
        </form>
    </AppLayout>
</template>
