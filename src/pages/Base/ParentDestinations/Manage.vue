<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Select from '../../../components/Form/Select.vue';
import { useAuthStore } from '../../../stores/auth.js';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({ name: '', code: '', taxes_included: false });
const errors = ref({});
const processing = ref(false);

// Markups: one row per hotel type and customer type (B2C / B2B). Empty amount = no markup.
const auth = useAuthStore();
const canSeeMarkups = auth.can('hotelContracts.list');
const canEditMarkups = auth.can('hotelContracts.edit');
const markups = ref([]);
const markupErrors = ref({});
const markupSaving = ref(false);
const markupSaved = ref(false);
const calcOptions = [{ value: 'percent', label: '%' }, { value: 'amount', label: 'EUR' }];

async function loadMarkups() {
    const { data } = await api.get(`/parent-destination-markups/${id}`);
    markups.value = castResource(data).rows ?? [];
}

async function saveMarkups() {
    markupSaving.value = true;
    markupSaved.value = false;
    markupErrors.value = {};
    try {
        await api.put(`/parent-destination-markups/${id}`, { rows: markups.value });
        markupSaved.value = true;
        await loadMarkups();
    } catch (error) {
        if (error.response?.status === 422) {
            markupErrors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        markupSaving.value = false;
    }
}

onMounted(async () => {
    if (isEdit && canSeeMarkups) {
        loadMarkups();
    }
    if (isEdit) {
        const { data } = await api.get(`/parent-destinations/${id}`);
        const parentDestination = castResource(data);
        Object.assign(form, {
            name: parentDestination.name ?? '',
            code: parentDestination.code ?? '',
            taxes_included: Boolean(parentDestination.taxes_included),
        });
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form, code: form.code.toUpperCase() };

    try {
        await (isEdit ? api.put(`/parent-destinations/${id}`, payload) : api.post('/parent-destinations', payload));
        router.push(routeUrl('parentDestinations.list'));
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
    <AppLayout :title="isEdit ? 'Edit parent destination' : 'New parent destination'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Parent destination details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div class="md:col-span-2">
                        <InputText v-model="form.name" label="Name *" placeholder="e.g. MALDIVES" :error="errors.name" />
                    </div>
                    <div>
                        <InputText
                            v-model="form.code"
                            label="Code *"
                            placeholder="e.g. MLE"
                            maxlength="8"
                            class="uppercase"
                            :error="errors.code"
                        />
                        <p class="mt-1 text-xs text-gray-500">Used as the static offer code prefix (e.g. MLE-001).</p>
                    </div>
                </div>

                <NiceCheckbox
                    v-model="form.taxes_included"
                    label="Taxes included"
                    :error="errors.taxes_included"
                    class="mt-4"
                />
            </FullWidthBox>

            <FullWidthBox v-if="isEdit && canSeeMarkups" title="Markups" :collapsible="false">
                <p class="mb-3 text-xs text-gray-500">
                    Used for every hotel of this destination by its hotel type, when the hotel's contract has no markup of its own.
                    EUR is per room for the whole stay. Leave the amount empty for no markup.
                </p>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Hotel type</th>
                                <th class="border border-gray-300 px-2 py-2">Customer type</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Calculation</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 180px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, i) in markups" :key="`${row.hotel_type}-${row.channel}`">
                                <td class="border border-gray-300 px-2 py-2">{{ row.hotel_type_name }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.channel }}</td>
                                <td class="border border-gray-300 px-2 py-1"><Select v-model="row.calc_type" :options="calcOptions" :placeholder="null" :disabled="! canEditMarkups" /></td>
                                <td class="border border-gray-300 px-2 py-1"><InputNumber v-model="row.amount" :disabled="! canEditMarkups" :error="markupErrors[`rows.${i}.amount`]" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="canEditMarkups" class="mt-3 flex items-center justify-end gap-3">
                    <span v-if="markupSaved" class="text-xs text-green-700">Markups saved.</span>
                    <Button type="button" variant="primary" :disabled="markupSaving" @click="saveMarkups">{{ markupSaving ? 'Saving…' : 'Save markups' }}</Button>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('parentDestinations.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update parent destination' : 'Create parent destination') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
