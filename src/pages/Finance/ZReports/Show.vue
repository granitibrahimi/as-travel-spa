<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ShowActions from '../../../components/ShowActions.vue';
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

const actions = computed(() => {
    if (! report.value) {
        return [];
    }

    const items = [];

    if (auth.can('zReports.delete')) {
        items.push({ label: 'Delete', danger: true, action: () => (showDelete.value = true) });
    }

    return items;
});

onMounted(async () => {
    const { data } = await api.get(`/z-reports/${id}`);
    report.value = castResource(data);
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/z-reports/${id}`);
        router.push(routeUrl('zReports.list'));
    } finally {
        deleting.value = false;
        showDelete.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="`Z-Report ${title}`" :collapsible="false">
            <template #actions>
                <ShowActions
                    :items="report ? actions : []"
                    :back-to="routeUrl('zReports.list')"
                    back-label="Z-Reports"
                    :title="`Z-Report ${title}`"
                />
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
                                <th class="border border-gray-300 px-2 py-2" style="width: 40px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2">Agent</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                                <th class="border border-gray-300 px-2 py-2">Date ant time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="(report.invoices ?? []).length === 0">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No linked invoices.</td>
                            </tr>
                            <tr v-for="invoice in (report.invoices ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span :class="invoice.in_report ? 'text-green-600' : 'text-red-500'">{{ invoice.in_report ? '✓' : '✗' }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ invoice.gen_id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.user }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.created_at }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
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
