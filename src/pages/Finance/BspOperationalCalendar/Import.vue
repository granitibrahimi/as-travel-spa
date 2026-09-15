<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';

// Uploads an IATA BSP Operational Calendar PDF. Upserts by period_code, so
// re-running this with a corrected or next-year PDF updates existing periods
// rather than duplicating them.

const fileInput = ref(null);

const processing = ref(false);
const errors = ref({});
const error = ref('');
const imported = ref(null);

async function submit() {
    const file = fileInput.value?.files?.[0];

    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};
    error.value = '';
    imported.value = null;

    try {
        const payload = new FormData();
        payload.append('file', file ?? '');

        const { data } = await api.post('/finance/bsp-operational-calendar/import', payload);
        imported.value = castResource(data)?.imported ?? 0;

        if (fileInput.value) {
            fileInput.value.value = '';
        }
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            error.value = e.response?.data?.message ?? 'Could not import the operational calendar.';
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Import Operational Calendar" fluid>
        <FullWidthBox title="Import (update) Operational Calendar" :collapsible="false">
            <p v-if="error" class="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>
            <p v-if="imported !== null" class="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                Imported {{ imported }} period(s). <RouterLink :to="routeUrl('bspOperationalCalendar.index')" class="underline">View the calendar</RouterLink>.
            </p>

            <form class="space-y-4" @submit.prevent="submit">
                <div>
                    <label class="mb-1 block text-sm text-gray-600">IATA BSP Operational Calendar (PDF) *</label>
                    <input
                        ref="fileInput"
                        type="file"
                        accept=".pdf"
                        class="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50"
                    >
                    <p v-if="errors.file" class="mt-1 text-sm text-red-600">{{ errors.file }}</p>
                </div>

                <div class="flex justify-end">
                    <Button type="submit" variant="primary" :loading="processing" :disabled="processing">
                        {{ processing ? 'Importing…' : 'Import' }}
                    </Button>
                </div>
            </form>
        </FullWidthBox>
    </AppLayout>
</template>
