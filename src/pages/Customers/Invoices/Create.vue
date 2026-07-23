<script setup>
import { computed, onMounted, ref } from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import api from '../../../helpers/api';
import { castResource, castMutation } from '../../../types/responses.js';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore } from '../../../stores/formOptions';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

// Create a customer invoice: a nested orders→persons editor scoped to a
// customer (route param). Mirrors the platform CreateCustomerInvoiceAction
// payload (orders[], dates d.m.Y). Supplier/destination use the autosuggest
// endpoints; products come from the shared formOptions store. Rows can be
// pre-filled by importing an Excel file.
const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();


const customer = ref(null);
const orders = ref([]);
const saving = ref(false);
const importing = ref(false);
const error = ref('');

const productOptions = computed(() => formOptions.products.map((product) => ({ value: product.id, label: product.name })));

const total = computed(() => orders.value.reduce(
    (sum, order) => sum + order.persons.reduce((s, person) => s + (parseFloat(person.sold_value) || 0), 0),
    0,
));

function blankPerson() {
    return { id: null, name_surname: '', sold_value: '', buying_value: '', tkt_number: '' };
}

function blankOrder() {
    return {
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

// Map an imported/api order shape ({ supplier:{id,name}, ... }) into an editor row.
function toEditorOrder(order) {
    return {
        supplier: order.supplier?.id ?? null,
        supplierOption: order.supplier ?? null,
        product: order.product?.id ?? null,
        destination: order.destination?.id ?? null,
        destinationOption: order.destination ?? null,
        extra_info: order.extra_info ?? '',
        start_date: order.start_date ?? '',
        return_date: order.return_date ?? '',
        persons: (order.persons ?? []).map((person) => ({
            id: null,
            name_surname: person.name_surname ?? '',
            sold_value: person.sold_value,
            buying_value: person.buying_value,
            tkt_number: person.tkt_number ?? '',
        })),
    };
}

onMounted(async () => {
    orders.value = [blankOrder()];

    try {
        const { data } = await api.get(`/customers/customers/${route.params.customer}`);
        customer.value = castResource(data);
    } catch {
        customer.value = null;
    }
});

const addOrder = () => orders.value.push(blankOrder());
const removeOrder = (index) => orders.value.splice(index, 1);
const addPerson = (order) => order.persons.push(blankPerson());
const removePerson = (order, index) => order.persons.splice(index, 1);

// Duplicate an order (with its persons) right below it.
function copyOrder(index) {
    const src = orders.value[index];
    orders.value.splice(index + 1, 0, {
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

async function importExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || importing.value) {
        return;
    }

    importing.value = true;
    error.value = '';

    try {
        const payload = new FormData();
        payload.append('file', file);
        const { data } = await api.post(`/customers/customers/${route.params.customer}/invoices/excel`, payload);
        orders.value = (data.orders ?? []).map(toEditorOrder);

        if (orders.value.length === 0) {
            orders.value = [blankOrder()];
        }
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not import the Excel file.';
    } finally {
        importing.value = false;
    }
}

async function save() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    error.value = '';

    try {
        const payload = {
            customer_id: route.params.customer,
            orders: orders.value.map((order) => ({
                supplier: order.supplier,
                product: order.product,
                destination: order.destination,
                extra_info: order.extra_info || null,
                start_date: order.start_date,
                return_date: order.return_date || null,
                persons: order.persons.map((person) => ({
                    name_surname: person.name_surname,
                    sold_value: person.sold_value,
                    buying_value: person.buying_value,
                    tkt_number: person.tkt_number,
                })),
            })),
        };

        const { data } = await api.post('/customers/invoices', payload);
        router.push(routeUrl('customerInvoices.show', castMutation(data).id));
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not create the invoice.';
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppLayout :title="'New Invoice for ' + customer?.full_name" fluid>
        <FullWidthBox title="New invoice" :collapsible="false" class="mb-6">
            <template #actions>

            </template>

            <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div class="flex gap-2"><dt class="w-24 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ customer?.full_name ?? customer?.name ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-24 shrink-0 font-medium text-gray-500">Total</dt><dd class="tabular-nums">{{ money(total) }}</dd></div>
            </dl>

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
                                <th class="px-2 py-2">TKT Number</th>
                                <th class="px-2 py-2" style="width: 130px;">Sold value</th>
                                <th class="px-2 py-2" style="width: 130px;">Buying value</th>
                                <th class="px-2 py-2 text-center" style="width: 60px;">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(person, pi) in order.persons" :key="pi" class="align-top">
                                <td class="px-2 py-2"><InputText v-model="person.name_surname" /></td>
                                <td class="px-2 py-2"><InputText v-model="person.tkt_number" /></td>
                                <td class="px-2 py-2"><InputText v-model="person.sold_value" type="number" /></td>
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

        <footer class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <Button type="button" @click="addOrder">+ Add order</Button>
                <div class="flex gap-2">



                    <Button variant="secondary" size="sm" class="mr-6">


                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
                        </svg>
                        <label class="cursor-pointer">
                            {{ importing ? 'Importing…' : 'Import from Excel' }}
                            <input type="file" accept=".xls,.xlsx" class="hidden" :disabled="importing" @change="importExcel">
                        </label>
                    </Button>
                    <Button type="button" @click="router.back()">Cancel</Button>
                    <Button type="button" variant="primary" :loading="saving" @click="save">Create invoice</Button>
            </div>
        </footer>

    </AppLayout>
</template>
