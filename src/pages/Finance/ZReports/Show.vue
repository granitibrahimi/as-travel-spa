<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const report = ref(null);
const title = computed(() => report.value?.report_id ?? `Z-Report #${id}`);

const showDelete = ref(false);
const deleting = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/z-reports/${id}`);
    report.value = data.data ?? data;
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/z-reports/${id}`);
        router.push('/z-reports');
    } finally {
        deleting.value = false;
        showDelete.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="`Z-Report ${title}`" :collapsible="false">
            <template v-if="report && auth.can('zReports.delete')" #actions>
                <Button variant="danger" size="sm" @click="showDelete = true">Delete</Button>
            </template>

            <Loader v-if="! report" />
            <template v-else>
                <dl class="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Date</dt><dd>{{ report.on_date }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Created by</dt><dd>{{ report.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(report.amount) }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Difference</dt><dd class="tabular-nums">{{ money(report.difference) }}</dd></div>
                    <div class="col-span-full py-1"><dt class="text-gray-500">Notes</dt><dd class="mt-1">{{ report.notes || '—' }}</dd></div>
                </dl>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">In report</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="(report.invoices ?? []).length === 0">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No linked invoices.</td>
                            </tr>
                            <tr v-for="invoice in (report.invoices ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ invoice.gen_id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ invoice.in_report ? 'Yes' : 'No' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #footer>
                <RouterLink to="/z-reports" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to Z-Reports
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="showDelete"
            title="Delete Z-Report?"
            :message="report ? `${report.report_id} will be deleted and its invoices unlinked.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
