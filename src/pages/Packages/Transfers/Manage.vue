<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const hotelsUrl = `${apiOrigin}/api/customers/hotels`;

const form = reactive({
    supplier_id: null, name: '', parent_destination_id: null, hotel_id: null, active: true, notes: '',
    bands: [{ min_pax: 1, max_pax: 5, price: null }],
});
const initial = ref({ supplier: null, destination: null, hotel: null });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (! isEdit) return;
    const t = castResource((await api.get(`/package-transfers/${id}`)).data);
    Object.assign(form, {
        supplier_id: t.supplier?.id ?? null, name: t.name, parent_destination_id: t.parent_destination?.id ?? null,
        hotel_id: t.hotel?.id ?? null, active: t.active, notes: t.notes ?? '', bands: t.bands.map((b) => ({ ...b })),
    });
    initial.value = { supplier: t.supplier, destination: t.parent_destination, hotel: t.hotel };
});

function addBand() {
    const last = form.bands[form.bands.length - 1];
    const from = last ? Number(last.max_pax) + 1 : 1;
    form.bands.push({ min_pax: from, max_pax: from + 4, price: null });
}

async function submit() {
    if (processing.value) return;
    processing.value = true;
    errors.value = {};
    try {
        await (isEdit ? api.put(`/package-transfers/${id}`, form) : api.post('/package-transfers', form));
        router.push(routeUrl('packageTransfers.list'));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(Object.entries(error.response.data.errors ?? {}).map(([k, v]) => [k, v[0]]));
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit Transfer' : 'New Transfer'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Transfer">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name * (e.g. Bodrum airport - Lujo)" :error="errors.name" />
                    <AsyncSelect :key="`s-${initial.supplier?.id}`" v-model="form.supplier_id" url="/suppliers/suppliers/autosuggest" :initial-option="initial.supplier" label="Supplier" placeholder="Search supplier…" :error="errors.supplier_id" />
                    <AsyncSelect :key="`d-${initial.destination?.id}`" v-model="form.parent_destination_id" url="/parent-destinations/autosuggest" :initial-option="initial.destination" label="Destination *" placeholder="Search destination…" :error="errors.parent_destination_id" />
                    <AsyncSelect
                        :key="`h-${initial.hotel?.id}-${form.parent_destination_id}`"
                        v-model="form.hotel_id"
                        :url="hotelsUrl"
                        label-key="title"
                        :params="form.parent_destination_id ? { parent_destination_id: form.parent_destination_id } : {}"
                        :initial-option="initial.hotel"
                        label="Only for hotel (empty = every hotel of the destination)"
                        placeholder="All hotels"
                        :error="errors.hotel_id"
                    />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Unit prices by group size">
                <p class="mb-3 text-sm text-gray-600">The price is for the whole group (one unit, e.g. one vehicle). Every traveller counts, infants included. The search also shows it per person.</p>
                <table class="text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="px-2 py-1">From persons</th>
                            <th class="px-2 py-1">To persons</th>
                            <th class="px-2 py-1">Unit price €</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(band, i) in form.bands" :key="i" class="align-top">
                            <td class="px-2 py-1 w-32"><InputNumber v-model="band.min_pax" :error="errors[`bands.${i}.min_pax`]" /></td>
                            <td class="px-2 py-1 w-32"><InputNumber v-model="band.max_pax" :error="errors[`bands.${i}.max_pax`]" /></td>
                            <td class="px-2 py-1 w-40"><InputNumber v-model="band.price" :error="errors[`bands.${i}.price`]" /></td>
                            <td class="px-2 py-1"><button v-if="form.bands.length > 1" type="button" class="mt-2 text-xs text-gray-500 hover:underline" @click="form.bands.splice(i, 1)">Remove</button></td>
                        </tr>
                    </tbody>
                </table>
                <p v-if="errors.bands" class="mt-1 text-xs text-red-600">{{ errors.bands }}</p>
                <button type="button" class="mt-2 text-sm text-red-600 hover:underline" @click="addBand">+ Add price band</button>
                <div class="mt-4 space-y-3">
                    <NiceCheckbox v-model="form.active" label="Active" />
                    <Textarea v-model="form.notes" label="Notes" />
                </div>
            </FullWidthBox>

            <div class="flex gap-2">
                <Button type="submit" variant="primary" :disabled="processing">{{ isEdit ? 'Save' : 'Create transfer' }}</Button>
                <Button type="button" @click="router.push(routeUrl('packageTransfers.list'))">Cancel</Button>
            </div>
        </form>
    </AppLayout>
</template>
