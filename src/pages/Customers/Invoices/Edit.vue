<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { money } from '../../../helpers/money';
import { useFormOptionsStore } from '../../../stores/formOptions';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
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
    const { data } = await api.get(`/customer-invoices/${route.params.id}/edit`);
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
        })),
    }));

    if (orders.value.length === 0) {
        orders.value.push(blankOrder());
    }

    loading.value = false;
}

const lockUrl = () => `/customer-invoices/${route.params.id}/lock`;

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
    await load();
    await acquireLock();
});

onBeforeUnmount(releaseLock);

const addOrder = () => orders.value.push(blankOrder());
const removeOrder = (index) => orders.value.splice(index, 1);
const addPerson = (order) => order.persons.push(blankPerson());
const removePerson = (order, index) => order.persons.splice(index, 1);

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

        await api.put(`/customer-invoices/${route.params.id}`, payload);
        router.push(`/customer-invoices/${route.params.id}`);
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not save the invoice.';
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
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
                            <AsyncSelect v-model="order.supplier" url="/suppliers/autosuggest" :initial-option="order.supplierOption" placeholder="Search for a supplier…" />
                        </div>
                        <Select v-model="order.product" label="Product" :options="productOptions" placeholder="Choose product…" />
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">Destination</label>
                            <AsyncSelect v-model="order.destination" url="/destinations/autosuggest" :initial-option="order.destinationOption" placeholder="Search for a destination…" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <DateInput v-model="order.start_date" label="Starting date" />
                            <DateInput v-model="order.return_date" label="Return date" />
                        </div>
                        <Textarea v-model="order.extra_info" label="Extra comments" :rows="3" />
                    </div>

                    <!-- Persons -->
                    <div class="overflow-x-auto lg:col-span-2">
                        <table class="w-full min-w-[560px] border-collapse text-sm">
                            <thead>
                                <tr class="text-left text-xs font-semibold uppercase text-gray-500">
                                    <th class="px-2 py-2">Name and surname</th>
                                    <th class="px-2 py-2" style="width: 150px;">TKT Number</th>
                                    <th class="px-2 py-2" style="width: 130px;">Sold value</th>
                                    <th class="px-2 py-2" style="width: 130px;">Buying value</th>
                                    <th class="px-2 py-2 text-center" style="width: 60px;">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(person, pi) in order.persons" :key="pi" class="align-top">
                                    <td class="px-2 py-2"><InputText v-model="person.name_surname" /></td>
                                    <td class="px-2 py-2"><InputText v-model="person.tkt_number" /></td>
                                    <td class="px-2 py-2"><InputText v-model="person.sold_value" type="number" :disabled="soldLocked" /></td>
                                    <td class="px-2 py-2"><InputText v-model="person.buying_value" type="number" /></td>
                                    <td class="px-2 py-2 text-center">
                                        <button
                                            v-if="order.persons.length > 1"
                                            type="button"
                                            class="inline-flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                                            aria-label="Remove person"
                                            @click="removePerson(order, pi)"
                                        >
                                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </FullWidthBox>

            <div class="mb-6 flex items-center justify-between">
                <Button type="button" @click="addOrder">+ Add order</Button>
                <div class="flex gap-2">
                    <Button type="button" @click="router.push(`/customer-invoices/${route.params.id}`)">Cancel</Button>
                    <Button type="button" variant="primary" :loading="saving" :disabled="Boolean(lockedBy)" @click="save">Save invoice</Button>
                </div>
            </div>
        </template>
    </AppLayout>
</template>
