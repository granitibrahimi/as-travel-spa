<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { routeUrl } from '../../../helpers/route.js';
import { downloadFile } from '../../../helpers/download.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import { useNotificationsStore } from '../../../stores/notifications.js';

const notifications = useNotificationsStore();
const downloading = ref(false);

async function download() {
    if (downloading.value) {
        return;
    }
    downloading.value = true;

    try {
        await downloadFile('/suppliers/suppliers/export', { fallbackName: 'suppliers.xlsx' });
    } catch {
        notifications.push({ type: 'error', message: 'Could not export suppliers.' });
    } finally {
        downloading.value = false;
    }
}
</script>

<template>
    <AppLayout title="Export Suppliers">
        <FullWidthBox title="Export Suppliers" :collapsible="false">
            <p class="text-sm text-gray-600">
                Download the full suppliers list as a spreadsheet.
            </p>

            <template #footer>
                <RouterLink :to="routeUrl('suppliers.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                    Back to Suppliers
                </RouterLink>
                <Button type="button" variant="primary" :loading="downloading" @click="download">
                    {{ downloading ? 'Preparing…' : 'Download' }}
                </Button>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
