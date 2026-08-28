<script setup>
import { computed, onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import { money } from '../../../helpers/money.js';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/balance-sheet?date=d.m.Y[&compare_date=d.m.Y][&include_zeros=1]
// Response (data-unwrapped by useReport):
//   { as_of, compare_to, fiscal_year_start,
//     sections: [{ key, label,
//       groups: [{ key, label, lines: [node], total, compare_total? }],
//       total, compare_total? }],
//     totals: { assets, liabilities, equity, liabilities_and_equity, compare_* },
//     balanced, difference }
// where a node is { account_id, number, name, own_amount, amount, children: [node],
// compare_own_amount?, compare_amount? } — assets positive, liabilities & equity
// sign-flipped to read positive; the equity group carries two synthetic
// (account_id: null) lines, retained_earnings and profit_for_year.
const { loading, error, errors, data, load } = useReport('/finance/reports/balance-sheet');
const notifications = useNotificationsStore();

const asOf = ref(todayApiDate());
const compareDate = ref('');
const includeZeros = ref(false);
const downloading = ref(false);

const comparing = computed(() => Boolean(data.value?.compare_to));

function filters() {
    return {
        date: asOf.value || undefined,
        compare_date: compareDate.value || undefined,
        include_zeros: includeZeros.value ? 1 : undefined,
    };
}

function preview() {
    load(filters());
}

// Flatten a group's nested account tree into indented rows for the table.
function flatten(nodes, depth = 0, out = []) {
    for (const node of nodes ?? []) {
        out.push({ ...node, depth });

        if (node.children?.length) {
            flatten(node.children, depth + 1, out);
        }
    }

    return out;
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    errors.value = {};

    try {
        await downloadFile('/finance/reports/balance-sheet/excel', {
            fallbackName: 'balance-sheet.xlsx',
            config: { params: filters() },
        });
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
            notifications.push({ type: 'error', message: e.response.data.message ?? 'Please fix the errors below.' });
        } else {
            notifications.push({ type: 'error', message: 'Could not export the report.' });
        }
    } finally {
        downloading.value = false;
    }
}

onMounted(preview);
</script>

<template>
    <AppLayout title="Balance Sheet" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Balance Sheet</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-start gap-4">
                    <DateInput v-model="asOf" label="As of Date" :error="errors.date" />
                    <DateInput v-model="compareDate" label="Compare to (optional)" :error="errors.compare_date" />

                    <div class="self-stretch pt-6">
                        <NiceCheckbox v-model="includeZeros" label="Include zero balances" />
                    </div>

                    <div class="flex items-end gap-3 self-stretch pt-6">
                        <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                        <Button type="button" :loading="downloading" @click="downloadExcel">
                            {{ downloading ? 'Preparing…' : 'Download Excel' }}
                        </Button>
                    </div>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <Loader v-if="loading" />

                <template v-else>
                    <div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
                        <span class="font-medium text-gray-700">As of {{ data.as_of }}</span>
                        <span v-if="comparing" class="text-gray-500">vs {{ data.compare_to }}</span>
                        <span
                            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            :class="data.balanced ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'"
                        >
                            {{ data.balanced ? 'Balanced' : `Out of balance by ${money(data.difference)}` }}
                        </span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Account</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 160px;">{{ data.as_of }}</th>
                                    <th v-if="comparing" class="border border-gray-300 px-2 py-2 text-right" style="width: 160px;">{{ data.compare_to }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-for="section in data.sections" :key="section.key">
                                    <tr class="bg-gray-100 font-semibold text-gray-800">
                                        <td class="border border-gray-300 px-2 py-2" :colspan="comparing ? 3 : 2">{{ section.label }}</td>
                                    </tr>

                                    <template v-for="group in section.groups" :key="group.key">
                                        <tr class="bg-gray-50 font-medium text-gray-700">
                                            <td class="border border-gray-300 px-2 py-1.5">{{ group.label }}</td>
                                            <td class="border border-gray-300 px-2 py-1.5"></td>
                                            <td v-if="comparing" class="border border-gray-300 px-2 py-1.5"></td>
                                        </tr>

                                        <tr v-for="line in flatten(group.lines)" :key="`${group.key}-${line.account_id ?? line.key}-${line.depth}`" class="hover:bg-gray-50">
                                            <td class="border border-gray-300 px-2 py-1.5">
                                                <span :style="{ paddingLeft: `${line.depth * 1.25}rem` }">
                                                    <span v-if="line.number" class="text-gray-400">{{ line.number }}</span>
                                                    {{ line.name }}
                                                </span>
                                            </td>
                                            <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(line.amount) }}</td>
                                            <td v-if="comparing" class="border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-500">{{ money(line.compare_amount) }}</td>
                                        </tr>

                                        <tr class="font-medium">
                                            <td class="border border-gray-300 px-2 py-1.5 text-right text-gray-600">Total {{ group.label }}</td>
                                            <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(group.total) }}</td>
                                            <td v-if="comparing" class="border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-500">{{ money(group.compare_total) }}</td>
                                        </tr>
                                    </template>

                                    <tr class="bg-gray-100 font-semibold text-gray-800">
                                        <td class="border border-gray-300 px-2 py-2 text-right">Total {{ section.label }}</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(section.total) }}</td>
                                        <td v-if="comparing" class="border border-gray-300 px-2 py-2 text-right tabular-nums text-gray-600">{{ money(section.compare_total) }}</td>
                                    </tr>
                                </template>

                                <tr class="border-t-2 border-gray-400 bg-gray-100 font-bold text-gray-900">
                                    <td class="border border-gray-300 px-2 py-2 text-right">Liabilities &amp; Equity</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(data.totals.liabilities_and_equity) }}</td>
                                    <td v-if="comparing" class="border border-gray-300 px-2 py-2 text-right tabular-nums text-gray-700">{{ money(data.totals.compare_liabilities_and_equity) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
