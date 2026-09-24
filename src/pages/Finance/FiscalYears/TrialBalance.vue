<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import TrialBalanceTable from '../../../components/TrialBalanceTable.vue';
import { routeUrl } from '../../../helpers/route.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/fiscal-years/:year/trial-balance — the trial balance stored when
// the year was closed (same shape as the live report, source "stored").
const route = useRoute();
const year = route.params.year;
const { loading, error, data, load } = useReport(`/finance/fiscal-years/${year}/trial-balance`);
const notifications = useNotificationsStore();
const downloading = ref(false);

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;

    try {
        await downloadFile(`/finance/fiscal-years/${year}/trial-balance/excel`, {
            fallbackName: `trial-balance-${year}.xlsx`,
        });
    } catch (e) {
        notifications.push({ type: 'error', message: e.response?.data?.message ?? 'Could not export the trial balance.' });
    } finally {
        downloading.value = false;
    }
}

onMounted(() => load());
</script>

<template>
    <AppLayout :title="`Trial balance ${year}`" fluid>
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h1 class="text-2xl font-bold">Trial balance {{ year }} <span class="text-base font-normal text-gray-500">(closed)</span></h1>
                <div class="flex items-center gap-3">
                    <RouterLink :to="routeUrl('fiscalYears.list')" class="text-sm text-gray-600 hover:text-red-700 hover:underline">← Fiscal years</RouterLink>
                    <Button type="button" :loading="downloading" @click="downloadExcel">
                        {{ downloading ? 'Preparing…' : 'Download Excel' }}
                    </Button>
                </div>
            </div>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else :collapsible="false">
                <Loader v-if="loading || ! data" />
                <TrialBalanceTable v-else :report="data" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
