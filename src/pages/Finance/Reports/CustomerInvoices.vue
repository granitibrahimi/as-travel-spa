<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import MultiSearchSelect from '../../../components/Form/MultiSearchSelect.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import CustomerInvoicesReport from '../../../components/CustomerInvoicesReport.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { toOptions, useFormOptionsStore } from '../../../stores/formOptions.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /customers/invoices/report?from=d.m.Y&to=d.m.Y[&agents[]=…&ticket_arrangement=…
//   &customer_types[]=…&parent_destinations[]=…&bonus_only=1&bonus_category=…] →
// { data: { items: [...], totals: { sales, purchase, svc } } }; useReport's
// castResource() unwraps the `data` envelope, so `data.value` here is
// `{ items, totals }`. The results table + client-side search live in the
// shared CustomerInvoicesReport component (reused by the CRM "My Invoices"
// report).
//
// The filters live in the URL query, so the Employee Bonus Calculation /
// payroll can link a bonus category's person count here (agents, period,
// type, customer types / parent destinations and the category itself), and
// Back restores them.
const { loading, error, errors, data, load } = useReport('/customers/invoices/report');
const notifications = useNotificationsStore();
const formOptions = useFormOptionsStore();
const route = useRoute();
const router = useRouter();

const list = (value) => (value === undefined || value === null ? [] : [].concat(value)).map(Number).filter(Number.isFinite);

const from = ref(route.query.from || todayApiDate());
const to = ref(route.query.to || todayApiDate());
const agents = ref(list(route.query.agents));
const ticketArrangement = ref(route.query.ticket_arrangement || null);
const customerTypes = ref(list(route.query.customer_types));
const parentDestinations = ref(list(route.query.parent_destinations));
const bonusOnly = ref(route.query.bonus_only === '1');
// Set only by a bonus link: the persons rated in that bonus category.
const bonusCategory = ref(route.query.bonus_category || null);
const bonusLabel = ref(route.query.bonus_label || '');
const downloading = ref(false);

const agentOptions = computed(() => toOptions(formOptions.agents));
const customerTypeOptions = computed(() => toOptions(formOptions.customerTypes));
const parentDestinationOptions = computed(() => toOptions(formOptions.parentDestinations));
const ticketArrangementOptions = [
    { value: 'bilete', label: 'Biletë' },
    { value: 'aranzhman', label: 'Aranzhman' },
];

function filters() {
    return {
        from: from.value || undefined,
        to: to.value || undefined,
        agents: agents.value.length ? agents.value : undefined,
        ticket_arrangement: ticketArrangement.value || undefined,
        customer_types: customerTypes.value.length ? customerTypes.value : undefined,
        parent_destinations: parentDestinations.value.length ? parentDestinations.value : undefined,
        bonus_only: bonusOnly.value || bonusCategory.value ? 1 : undefined,
        bonus_category: bonusCategory.value || undefined,
    };
}

function apply() {
    const params = filters();

    router.replace({ query: { ...params, bonus_label: bonusCategory.value ? bonusLabel.value || undefined : undefined } });
    load(params);
}

function clearBonusCategory() {
    bonusCategory.value = null;
    bonusLabel.value = '';
    apply();
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }
    downloading.value = true;

    try {
        await downloadFile('/customers/invoices/report/excel', {
            fallbackName: 'customer-invoices.xlsx',
            config: { params: filters() },
        });
    } catch {
        notifications.push({ type: 'error', message: 'Could not export the report.' });
    } finally {
        downloading.value = false;
    }
}

onMounted(apply);
</script>

<template>
    <AppLayout title="Customer Invoices Report" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Customer Invoices Report</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DateInput v-model="from" label="From" :error="errors.from" />
                    <DateInput v-model="to" label="To" :error="errors.to" />
                    <Select v-model="ticketArrangement" label="Type" :options="ticketArrangementOptions" placeholder="All" :error="errors.ticket_arrangement" />
                    <MultiSearchSelect v-model="agents" label="Agents" :options="agentOptions" placeholder="All agents" />
                    <MultiSearchSelect v-model="customerTypes" label="Customer types" :options="customerTypeOptions" placeholder="All customer types" />
                    <MultiSearchSelect v-model="parentDestinations" class="sm:col-span-2" label="Parent destinations" :options="parentDestinationOptions" placeholder="All parent destinations" />
                    <div class="flex items-end pb-1.5">
                        <NiceCheckbox
                            :model-value="bonusOnly || Boolean(bonusCategory)"
                            :disabled="Boolean(bonusCategory)"
                            label="Only persons counted for bonuses"
                            @update:model-value="bonusOnly = $event"
                        />
                    </div>
                </div>

                <div v-if="bonusCategory" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span class="text-gray-500">Bonus category:</span>
                    <span class="inline-flex items-center gap-1 rounded bg-indigo-100 py-0.5 pl-2 pr-1 font-medium text-indigo-700">
                        {{ bonusLabel || bonusCategory }}
                        <button type="button" class="px-0.5 text-indigo-400 hover:text-indigo-800" aria-label="Remove the bonus category" @click="clearBonusCategory">×</button>
                    </span>
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-3">
                    <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                    <Button type="button" :loading="downloading" @click="downloadExcel">
                        {{ downloading ? 'Preparing…' : 'Download Excel' }}
                    </Button>
                </div>

                <p class="mt-3 text-xs text-gray-500">
                    Biletë = invoices without a hotel order, Aranzhman = invoices with one. Parent destinations filter on the invoice's parent destination.
                    Counted for bonuses = not ghost, no credit notes, no ignored persons.
                </p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <CustomerInvoicesReport :data="data" :loading="loading" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
