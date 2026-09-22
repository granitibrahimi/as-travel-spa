<script setup>
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Loader from '../../../components/Loader.vue';
import ApiPagination from '../../../components/ApiPagination.vue';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, apply, clear, goToPage } = useListFilters(
    { year: '' },
    async (params, { signal }) => castPaginated((await api.get('/finance/bsp-operational-calendar', { params, signal })).data),
);
</script>

<template>
    <AppLayout title="Operational Calendar" fluid>
        <FullWidthBox title="BSP Operational Calendar" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="apply">
                <InputText v-model="filters.year" label="Year" placeholder="2026" class="w-28" />
                <Button type="submit" variant="primary">Filter</Button>
                <Button type="button" @click="clear">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">Period code</th>
                            <th class="border border-gray-300 px-2 py-2">Billing from</th>
                            <th class="border border-gray-300 px-2 py-2">Billing to</th>
                            <th class="border border-gray-300 px-2 py-2">Availability</th>
                            <th class="border border-gray-300 px-2 py-2">Remittance day</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No operational calendar periods found.</td>
                        </tr>
                        <tr v-for="period in (loading ? [] : apiResponse?.data ?? [])" :key="period.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ period.period_code }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ period.billing_from }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ period.billing_to }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ period.billing_availability }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ period.remittance_day }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <RouterLink
                                    v-if="period.paid"
                                    :to="routeUrl('supplierPayments.show', period.supplier_payment_id)"
                                    class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:underline"
                                >Paid — {{ period.supplier_payment_gen_id }}</RouterLink>
                                <span v-else class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Unpaid</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('bspOperationalCalendar.import')"
                    :to="routeUrl('bspOperationalCalendar.import')"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Import calendar
                </RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
