<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import { todayApiDate, apiDaysAfter } from '../../../helpers/date';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

// Only the date range is server-side (submit "View report"). The endpoint
// returns the whole range unpaginated, so the customer-name and agent filters
// narrow the loaded rows in the browser without a round-trip.
const filters = reactive({
    from: todayApiDate(),
    to: apiDaysAfter(30),
});

// Client-side filters.
const search = ref('');

// Agent name to filter by (null = all). Departures carry the agent's full name
// only (no id), and `auth.user.name` is that same `fullName()`, so "only mine"
// is a plain name match. Defaults to the current user — "only mine" starts on
// (auth.user is resolved before this page mounts; falls back to "all" if not).
const myName = computed(() => auth.user?.name ?? '');
const agent = ref(myName.value || null);
const onlyMine = computed({
    get: () => !! agent.value && agent.value === myName.value,
    set: (on) => { agent.value = on ? myName.value : null; },
});

const departures = ref(null);
const loading = ref(false);

let request = null;

async function fetchDepartures() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/departures', {
            signal: controller.signal,
            params: {
                from: filters.from || undefined,
                to: filters.to || undefined,
            },
        });
        departures.value = data.data;
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

// Distinct agents present in the loaded rows, sorted, as <Select> options. The
// active selection is kept in the list even if the current report has no rows
// for that agent (e.g. "only mine" when none of my departures fall in range),
// so the dropdown always reflects what's being filtered.
const agentOptions = computed(() => {
    const names = new Set();

    for (const departure of departures.value ?? []) {
        if (departure.agent) {
            names.add(departure.agent);
        }
    }

    if (agent.value) {
        names.add(agent.value);
    }

    return [...names]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name }));
});

const visibleDepartures = computed(() => {
    const term = search.value.trim().toLowerCase();

    return (departures.value ?? []).filter((departure) => {
        if (agent.value && departure.agent !== agent.value) {
            return false;
        }

        if (! term) {
            return true;
        }

        // Full-row search across every visible column.
        return [
            departure.invoice_gen_id,
            departure.start_date,
            departure.destination,
            departure.customer,
            departure.agent,
        ].some((field) => String(field ?? '').toLowerCase().includes(term));
    });
});

onMounted(fetchDepartures);
</script>

<template>
    <AppLayout title="Departures" fluid>
        <div class="space-y-6">
            <FullWidthBox title="Filters" :collapsible="false">
                <form
                    class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
                    @submit.prevent="fetchDepartures"
                >
                    <DateInput v-model="filters.from" label="From date" />
                    <DateInput v-model="filters.to" label="To date" />
                    <InputText v-model="search" label="Search" placeholder="Search departures…" />
                    <Select
                        v-model="agent"
                        :options="agentOptions"
                        label="Agent"
                        placeholder="All agents"
                    />
                    <NiceCheckbox
                        v-model="onlyMine"
                        label="Only mine"
                        :disabled="! myName"
                        class="pb-1.5"
                    />
                    <Button type="submit" variant="primary" class="w-full">View report</Button>
                </form>
            </FullWidthBox>

            <FullWidthBox title="Departures" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Start date</th>
                                <th class="border border-gray-300 px-2 py-2">Destination</th>
                                <th class="border border-gray-300 px-2 py-2">Client</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 180px;">Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! departures">
                                <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="visibleDepartures.length === 0">
                                <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No departures found.</td>
                            </tr>
                            <tr v-for="departure in (loading ? [] : visibleDepartures)" :key="`${departure.invoice_id}-${departure.start_date}`" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="routeUrl('customerInvoices.show', departure.invoice_id)" class="text-red-700 hover:underline">{{ departure.invoice_gen_id }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">{{ departure.start_date }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.destination }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ departure.agent }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
