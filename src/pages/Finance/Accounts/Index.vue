<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Select from '../../../components/Form/Select.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const formOptions = useFormOptionsStore();

const apiResponse = ref(null);
const loading = ref(false);
const q = ref('');
const classification = ref('');

// Classification options come from the shared form-options store.
const classifications = computed(() => toOptions(formOptions.accountClassifications));

// A row's `classification` is serialized as an object ({ id, name }); the
// selected option value is the classification id. Match on the id, falling
// back to the readable name — and tolerate a plain id/label shape too.
// NOTE: the API has no classification filter, so this only narrows the
// current page's 100 rows, not the whole dataset — good enough given the
// page size, but worth knowing if the account list ever grows much larger.
function matchesClassification(row) {
    if (! classification.value) {
        return true;
    }

    const selected = String(classification.value);
    const rc = row.classification;
    const rowId = String(rc?.id ?? rc ?? '');

    if (rowId === selected) {
        return true;
    }

    const option = classifications.value.find((o) => String(o.value) === selected);
    const rowName = String(rc?.name ?? rc ?? '').toLowerCase();

    return option ? rowName === String(option.label).toLowerCase() : false;
}

let request = null;

async function fetchAccounts(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/finance/accounts', {
            signal: controller.signal,
            params: { q: q.value || undefined, page },
        });
        apiResponse.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => fetchAccounts());

const filtered = computed(() => (apiResponse.value?.data ?? []).filter(matchesClassification));
</script>

<template>
    <AppLayout title="Accounts" fluid>
        <FullWidthBox title="Accounts" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-2xl" @submit.prevent="fetchAccounts()">
                <input v-model="q" type="text" placeholder="Number, name or type…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                <Select v-model="classification" :options="classifications" placeholder="All classifications" />
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Number</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No accounts found.</td>
                        </tr>
                        <tr v-for="account in (loading ? [] : filtered)" :key="account.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ account.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ account.number }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('accounts.history', account.id)" class="hover:text-red-700 hover:underline">{{ account.name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ account.type }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(account.balance) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchAccounts" />
        </FullWidthBox>
    </AppLayout>
</template>
