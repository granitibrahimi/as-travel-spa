<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';
import { startOfMonthApiDate, endOfMonthApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { useAuthStore } from '../../../stores/auth.js';

// GET /users/vacations/report?from=d.m.Y&to=d.m.Y — one row per active
// non-admin user (sorted by name), approved working-days per vacation type
// that fall inside the range. Both params are required and validated
// (to after_or_equal from); useReport surfaces a 422 as field-level `errors`.
// Response: { data: { from, to, rows: [{ nr, user_id, name, paid_vacation,
// sick_leave, special_leave, total }], totals: { paid_vacation, sick_leave,
// special_leave, total } } }.
const auth = useAuthStore();
const { loading, error, errors, data, load } = useReport('/users/vacations/report');

const from = ref(startOfMonthApiDate());
const to = ref(endOfMonthApiDate());

const rows = computed(() => data.value?.rows ?? []);
const totals = computed(() => data.value?.totals ?? null);

function preview() {
    load({ from: from.value || undefined, to: to.value || undefined });
}

onMounted(() => {
    if (auth.can('vacations.report')) {
        preview();
    }
});
</script>

<template>
    <AppLayout title="Vacation Days Report" fluid>
        <div v-if="auth.can('vacations.report')" class="space-y-4">
            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-end gap-3">
                    <DateInput v-model="from" label="From" :error="errors.from" />
                    <DateInput v-model="to" label="To" :error="errors.to" />
                    <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" :title="`Results — ${data.from} to ${data.to}`" :collapsible="false">
                <Loader v-if="loading" />

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">Nr</th>
                                <th class="border border-gray-300 px-2 py-2">Name</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Paid Vacation</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Sick Leave</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Special Leave</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 100px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rows" :key="row.user_id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ row.nr }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink
                                        v-if="auth.can('users.show')"
                                        :to="routeUrl('users.show', row.user_id)"
                                        class="text-red-700 hover:underline"
                                    >{{ row.name }}</RouterLink>
                                    <template v-else>{{ row.name }}</template>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.paid_vacation }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.sick_leave }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.special_leave }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium tabular-nums">{{ row.total }}</td>
                            </tr>
                            <tr v-if="rows.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No data for this range.</td>
                            </tr>
                            <tr v-if="totals && rows.length > 0" class="bg-gray-50 font-semibold">
                                <td colspan="2" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ totals.paid_vacation }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ totals.sick_leave }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ totals.special_leave }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ totals.total }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
