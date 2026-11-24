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
import DatePicker from '../../../components/Form/DatePicker.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);
const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];

const form = reactive({
    supplier_id: null, name: '', from_name: '', to_parent_destination_id: null,
    valid_from: '', valid_to: '', booking_from: '', booking_to: '',
    outbound_weekdays: [6], return_weekdays: [6],
    price_adult: null, price_child: null, price_infant: 0, baggage_kg: null, active: true, notes: '',
});
const initial = ref({ supplier: null, destination: null });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (! isEdit) return;
    const c = castResource((await api.get(`/package-charters/${id}`)).data);
    Object.assign(form, {
        supplier_id: c.supplier?.id ?? null, name: c.name, from_name: c.from_name, to_parent_destination_id: c.to_parent_destination?.id ?? null,
        valid_from: c.valid_from ?? '', valid_to: c.valid_to ?? '', booking_from: c.booking_from ?? '', booking_to: c.booking_to ?? '',
        outbound_weekdays: c.outbound_weekdays, return_weekdays: c.return_weekdays,
        price_adult: c.price_adult, price_child: c.price_child, price_infant: c.price_infant, baggage_kg: c.baggage_kg, active: c.active, notes: c.notes ?? '',
    });
    initial.value = { supplier: c.supplier, destination: c.to_parent_destination };
});

const toggleDay = (key, day) => {
    const list = form[key];
    const i = list.indexOf(day);
    if (i >= 0) list.splice(i, 1); else list.push(day);
};

async function submit() {
    if (processing.value) return;
    processing.value = true;
    errors.value = {};
    try {
        await (isEdit ? api.put(`/package-charters/${id}`, form) : api.post('/package-charters', form));
        router.push(routeUrl('packageCharters.list'));
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
    <AppLayout :title="isEdit ? 'Edit Charter' : 'New Charter'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Charter">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name * (e.g. Prishtina - Bodrum Saturday)" :error="errors.name" />
                    <AsyncSelect :key="`s-${initial.supplier?.id}`" v-model="form.supplier_id" url="/suppliers/suppliers/autosuggest" :initial-option="initial.supplier" label="Supplier" placeholder="Search supplier…" :error="errors.supplier_id" />
                    <InputText v-model="form.from_name" label="From * (city or airport, e.g. Prishtina PRN)" :error="errors.from_name" />
                    <AsyncSelect :key="`d-${initial.destination?.id}`" v-model="form.to_parent_destination_id" url="/parent-destinations/autosuggest" :initial-option="initial.destination" label="To destination *" placeholder="Search destination…" :error="errors.to_parent_destination_id" />
                    <DatePicker v-model="form.valid_from" label="Travel dates from *" :error="errors.valid_from" />
                    <DatePicker v-model="form.valid_to" label="Travel dates to *" :error="errors.valid_to" />
                    <DatePicker v-model="form.booking_from" label="Valid for reservations from" :error="errors.booking_from" />
                    <DatePicker v-model="form.booking_to" label="Valid for reservations to" :error="errors.booking_to" />
                </div>
                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div v-for="[key, label] in [['outbound_weekdays', 'Flies out on *'], ['return_weekdays', 'Flies back on *']]" :key="key">
                        <label class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
                        <div class="flex flex-wrap gap-1">
                            <button
                                v-for="[day, name] in DAYS"
                                :key="day"
                                type="button"
                                class="rounded border px-2 py-1 text-sm"
                                :class="form[key].includes(day) ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                                @click="toggleDay(key, day)"
                            >{{ name }}</button>
                        </div>
                        <p v-if="errors[key]" class="mt-1 text-xs text-red-600">{{ errors[key] }}</p>
                    </div>
                </div>
                <p class="mt-2 text-xs text-gray-500">The search adds the charter only when check-in is a flying-out day and check-out a flying-back day, inside the travel dates.</p>
            </FullWidthBox>

            <FullWidthBox title="Prices per person (fixed)">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <InputNumber v-model="form.price_adult" label="Adult € *" :error="errors.price_adult" />
                    <InputNumber v-model="form.price_child" label="Child 2-11.99 € *" :error="errors.price_child" />
                    <InputNumber v-model="form.price_infant" label="Infant 0-1.99 € *" :error="errors.price_infant" />
                    <InputNumber v-model="form.baggage_kg" label="Baggage kg" :error="errors.baggage_kg" />
                </div>
                <div class="mt-4 space-y-3">
                    <NiceCheckbox v-model="form.active" label="Active" />
                    <Textarea v-model="form.notes" label="Notes" />
                </div>
            </FullWidthBox>

            <div class="flex gap-2">
                <Button type="submit" variant="primary" :disabled="processing">{{ isEdit ? 'Save' : 'Create charter' }}</Button>
                <Button type="button" @click="router.push(routeUrl('packageCharters.list'))">Cancel</Button>
            </div>
        </form>
    </AppLayout>
</template>
