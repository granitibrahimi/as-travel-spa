<script setup>
import { onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ReportTable from '../../../components/ReportTable.vue';
import Loader from '../../../components/Loader.vue';
import { useReport } from '../../../composables/useReport.js';

// TODO: placeholder endpoint — swap for the real one once it's available.
const { loading, error, data, load } = useReport('/finance/reports/purchases-book');

const from = ref(null);
const to = ref(null);

function apply() {
    load({
        from: from.value || undefined,
        to: to.value || undefined,
    });
}

onMounted(apply);
</script>

<template>
    <AppLayout title="Purchases Book" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Purchases Book <span class="text-gray-400">(Libri i Blerjeve)</span></h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-end gap-3">
                    <DateInput v-model="from" label="From" />
                    <DateInput v-model="to" label="To" />
                    <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <Loader v-if="loading" />
                <ReportTable v-else :rows="data.rows ?? []" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
