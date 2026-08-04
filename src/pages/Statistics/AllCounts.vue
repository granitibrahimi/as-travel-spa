<script setup>
import { computed, onMounted } from 'vue';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';
import { useReport } from '../../composables/useReport.js';

const { loading, error, data, load } = useReport('/statistics/all-counts');

const tablesTotal = computed(() => (data.value?.tables ?? []).reduce((sum, row) => sum + Number(row.count), 0));

onMounted(() => load());
</script>

<template>
    <AppLayout title="All Counts" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">All Counts</h1>

            <Loader v-if="loading && ! data" message="Loading counts" />
            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <div v-if="data" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FullWidthBox title="Application counts" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Entity</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Total</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Without QB id</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in data.counts" :key="row.entity" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.entity }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.total }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.without_qb }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.percentage }} %</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>

                <FullWidthBox title="Table counts" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Table</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in data.tables" :key="row.table" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.table }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.count }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="font-semibold">
                                    <td class="border border-gray-300 px-2 py-2">Total</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ tablesTotal }}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </FullWidthBox>
            </div>
        </div>
    </AppLayout>
</template>
