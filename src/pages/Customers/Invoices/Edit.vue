<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore } from '../../../stores/formOptions';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

// Edit a customer invoice's orders and their persons. Header (customer/date) is
// read-only here — those have dedicated change-* screens. Mirrors the platform
// UpdateCustomerInvoiceAction payload: orders[] with nested persons[], dates in
// d.m.Y. Supplier/destination use the autosuggest endpoints; products come from
// the shared formOptions store.
const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();


const invoice = ref(null);
const orders = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const errors = ref({});

// Validation errors come back keyed like `orders.0.supplier` / `orders.0.persons.1.sold_value`.
function orderError(orderIndex, field) {
    return errors.value[`orders.${orderIndex}.${field}`];
}

function personError(orderIndex, personIndex, field) {
    return errors.value[`orders.${orderIndex}.persons.${personIndex}.${field}`];
}

// Pessimistic edit lock: another user editing blocks saving here.
const lockedBy = ref(null);
let heartbeat = null;

const productOptions = computed(() => formOptions.products.map((product) => ({ value: product.id, label: product.name })));

// Sold values only apply when nothing has been paid yet (matches the backend).
const soldLocked = computed(() => (invoice.value?.paid_amount ?? 0) != 0);

// Live invoice total from the persons' sold values.
const total = computed(() => orders.value.reduce(
    (sum, order) => sum + order.persons.reduce((s, person) => s + (parseFloat(person.sold_value) || 0), 0),
    0,
));

function blankPerson() {
    return { id: null, name_surname: '', sold_value: '', buying_value: '', tkt_number: '' };
}

function blankOrder() {
    return {
        id: null,
        supplier: null,
        supplierOption: null,
        product: null,
        destination: null,
        destinationOption: null,
        extra_info: '',
        start_date: '',
        return_date: '',
        persons: [blankPerson()],
    };
}

async function load() {
    const { data } = await api.get(`/customers/invoices/${route.params.id}/edit`);
    invoice.value = data.data;

    orders.value = (data.data.orders ?? []).map((order) => ({
        id: order.id,
        supplier: order.supplier?.id ?? null,
        supplierOption: order.supplier?.id ? { id: order.supplier.id, name: order.supplier.name } : null,
        product: order.product?.id ?? null,
        destination: order.destination?.id ?? null,
        destinationOption: order.destination?.id ? { id: order.destination.id, name: order.destination.name } : null,
        extra_info: order.extra_info ?? '',
        start_date: order.start_date ?? '',
        return_date: order.return_date ?? '',
        persons: (order.persons ?? []).map((person) => ({
            id: person.id,
            name_surname: person.name_surname ?? '',
            sold_value: person.sold_value,
            buying_value: person.buying_value,
            tkt_number: person.tkt_number ?? '',
            bill_id: person.bill_id ?? null,
            qb_link: person.qb_link ?? null,
        })),
    }));

    if (orders.value.length === 0) {
        orders.value.push(blankOrder());
    }

    loading.value = false;
}

const lockUrl = () => `/customers/invoices/${route.params.id}/lock`;

async function acquireLock() {
    try {
        await api.post(lockUrl());
        lockedBy.value = null;
        // Refresh the lock well within its 60s server TTL.
        heartbeat = setInterval(() => {
            api.post(`${lockUrl()}/heartbeat`).catch((e) => {
                if (e.response?.status === 409) {
                    lockedBy.value = e.response.data?.holder?.name ?? 'another user';
                    stopHeartbeat();
                }
            });
        }, 30000);
    } catch (e) {
        if (e.response?.status === 409) {
            lockedBy.value = e.response.data?.holder?.name ?? 'another user';
        }
    }
}

function stopHeartbeat() {
    if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
    }
}

function releaseLock() {
    stopHeartbeat();
    if (!lockedBy.value) {
        api.delete(lockUrl()).catch(() => {});
    }
}

onMounted(async () => {
    // Independent requests (acquireLock only needs route.params.id) — run
    // concurrently instead of waiting on load() first.
    await Promise.all([load(), acquireLock()]);
});

onBeforeUnmount(releaseLock);

const addOrder = () => orders.value.push(blankOrder());
const removeOrder = (index) => orders.value.splice(index, 1);
const addPerson = (order) => order.persons.push(blankPerson());
const removePerson = (order, index) => order.persons.splice(index, 1);

// Re-pull a single person from the DB (e.g. after it was updated elsewhere)
// and patch the row in place, rather than reloading the whole invoice.
async function refreshPerson(person) {
    if (person._refreshing) {
        return;
    }

    person._refreshing = true;

    try {
        const { data } = await api.get(`/customers/invoice-order-person/${person.id}`);
        const updated = castResource(data);
        person.name_surname = updated.name_surname ?? '';
        person.tkt_number = updated.tkt_number ?? '';
        person.sold_value = updated.sold_value;
        person.buying_value = updated.buying_value;
        person.bill_id = updated.bill_id ?? null;
        person.qb_link = updated.qb_link ?? null;
    } finally {
        person._refreshing = false;
    }
}

// Duplicate an order (with its persons, as new rows) right below it.
function copyOrder(index) {
    const src = orders.value[index];
    orders.value.splice(index + 1, 0, {
        id: null,
        supplier: src.supplier,
        supplierOption: src.supplierOption ? { ...src.supplierOption } : null,
        product: src.product,
        destination: src.destination,
        destinationOption: src.destinationOption ? { ...src.destinationOption } : null,
        extra_info: src.extra_info,
        start_date: src.start_date,
        return_date: src.return_date,
        persons: src.persons.map((person) => ({ ...person, id: null })),
    });
}

async function save() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    error.value = '';
    errors.value = {};

    try {
        const payload = {
            orders: orders.value.map((order) => ({
                id: order.id,
                supplier: order.supplier,
                product: order.product,
                destination: order.destination,
                extra_info: order.extra_info || null,
                start_date: order.start_date,
                return_date: order.return_date || null,
                persons: order.persons.map((person) => ({
                    id: person.id,
                    name_surname: person.name_surname,
                    sold_value: person.sold_value,
                    buying_value: person.buying_value,
                    tkt_number: person.tkt_number,
                })),
            })),
        };

        await api.put(`/customers/invoices/${route.params.id}`, payload);
        router.push(routeUrl('customerInvoices.show', route.params.id));
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
            error.value = e.response.data.message ?? 'Please fix the errors below.';
        } else {
            error.value = e.response?.data?.message ?? 'Could not save the invoice.';
        }
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppLayout :title="invoice ? `Edit invoice ${invoice.gen_id}` : 'Edit invoice'" fluid>
        <Loader v-if="loading" />

        <template v-else>
            <FullWidthBox :title="`Edit invoice ${invoice.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                    <div class="flex gap-2"><dt class="w-24 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ invoice.customer?.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-24 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ invoice.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-24 shrink-0 font-medium text-gray-500">Total</dt><dd class="tabular-nums">{{ money(total) }}</dd></div>
                </dl>

                <p v-if="lockedBy" class="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                    This invoice is currently being edited by {{ lockedBy }}. Saving is disabled until they finish.
                </p>
                <p v-if="soldLocked" class="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    This invoice has payments — sold values are locked and won't be changed.
                </p>
                <p v-if="error" class="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
            </FullWidthBox>

            <FullWidthBox
                v-for="(order, oi) in orders"
                :key="oi"
                :title="`Order ${oi + 1}`"
                :collapsible="false"
                class="mb-4"
            >
                <template #actions>
                    <button type="button" class="inline-flex items-center gap-1.5 rounded bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600" @click="addPerson(order)">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-9 2v-2H4v2H2v2h2v2h2v-2h2v-2Zm9 .5c-3 0-9 1.5-9 4.5v2h12l6 .006V19c0-3-6-4.5-9-4.5Z"/></svg>
                        New Person
                    </button>
                    <button type="button" class="inline-flex items-center gap-1.5 rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900" @click="copyOrder(oi)">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15"/></svg>
                        Copy
                    </button>
                    <button v-if="orders.length > 1" type="button" class="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700" @click="removeOrder(oi)">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"/></svg>
                        Delete
                    </button>
                </template>

                <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <!-- Order fields -->
                    <div class="space-y-4 lg:col-span-1">
                        <AsyncSelect v-model="order.supplier" label="Vendor" url="/suppliers/suppliers/autosuggest" :initial-option="order.supplierOption" placeholder="Search for a supplier…" :error="orderError(oi, 'supplier')" />
                        <Select v-model="order.product" label="Product" :options="productOptions" placeholder="Choose product…" :error="orderError(oi, 'product')" />
                        <AsyncSelect v-model="order.destination" label="Destination" url="/destinations/autosuggest" :initial-option="order.destinationOption" placeholder="Search for a destination…" :error="orderError(oi, 'destination')" />
                        <div class="grid grid-cols-2 gap-3">
                            <DateInput v-model="order.start_date" label="Starting date" :error="orderError(oi, 'start_date')" />
                            <DateInput v-model="order.return_date" label="Return date" :error="orderError(oi, 'return_date')" />
                        </div>
                        <Textarea v-model="order.extra_info" label="Extra comments" :rows="3" :error="orderError(oi, 'extra_info')" />
                    </div>

                    <!-- Persons -->
                    <div class="space-y-6 lg:col-span-2">
                        <div
                            v-for="(person, pi) in order.persons"
                            :key="pi"
                            class="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-[1fr_1fr_auto]"
                        >
                            <div class="space-y-4">
                                <InputText v-model="person.name_surname" label="Name and surname" :error="personError(oi, pi, 'name_surname')" />
                                <InputText v-model="person.tkt_number" label="TKT Number" :error="personError(oi, pi, 'tkt_number')" />
                            </div>
                            <div class="space-y-4">
                                <InputNumber v-model="person.sold_value" label="Sold value" :disabled="soldLocked" :error="personError(oi, pi, 'sold_value')" />
                                <InputNumber v-model="person.buying_value" label="Buying value" :error="personError(oi, pi, 'buying_value')" />
                            </div>
                            <div class="flex flex-row gap-2 sm:flex-col sm:justify-center">
                                <a
                                    v-if="person.bill_id"
                                    :href="routeUrl('supplierBills.show', person.bill_id)"
                                    target="_blank"
                                    rel="noopener"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
                                    aria-label="View bill"
                                    title="View bill"
                                >
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                                </a>
                                <button
                                    v-if="person.id"
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                    aria-label="Refresh from database"
                                    title="Refresh from database"
                                    :disabled="person._refreshing"
                                    @click="refreshPerson(person)"
                                >
                                    <svg class="h-4 w-4" :class="{ 'animate-spin': person._refreshing }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                                <button
                                    v-if="order.persons.length > 1"
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                                    aria-label="Remove person"
                                    @click="removePerson(order, pi)"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </FullWidthBox>

            <div class="mb-6 flex items-center justify-between">
                <Button type="button" @click="addOrder">+ Add order</Button>
                <div class="flex gap-2">
                    <Button type="button" @click="router.push(routeUrl('customerInvoices.show', route.params.id))">Cancel</Button>
                    <Button type="button" variant="primary" :loading="saving" :disabled="Boolean(lockedBy)" @click="save">Save invoice</Button>
                </div>
            </div>
        </template>
    </AppLayout>
</template>
