<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

const router = useRouter();

const customersUrl = 'customers/autosuggest';

const form = reactive({
    name: '',
    reference: '',
    start_date: '',
    end_date: '',
    total_amount: '',
});

const selectedCustomers = ref([]); // [{ id, name }]
const errors = ref({});
const saving = ref(false);

function addCustomer(option) {
    if (option && ! selectedCustomers.value.some((c) => c.id === option.value)) {
        selectedCustomers.value.push({ id: option.value, name: option.label });
    }
}

function removeCustomer(id) {
    selectedCustomers.value = selectedCustomers.value.filter((c) => c.id !== id);
}

function fieldError(name) {
    return errors.value[name]?.[0] ?? '';
}

async function submit() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    errors.value = {};

    try {
        await api.post('/customers/projects', {
            ...form,
            start_date: form.start_date,
            end_date: form.end_date,
            customers: selectedCustomers.value.map((c) => c.id),
        });
        router.push(routeUrl('customerProjects.list'));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else {
            throw error;
        }
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppLayout title="New Project" fluid>
        <form class="grid gap-4 lg:grid-cols-3" @submit.prevent="submit">
            <FullWidthBox title="Project details" :collapsible="false" class="lg:col-span-2">
                <div class="space-y-4">
                    <InputText v-model="form.name" label="Project Name" :error="fieldError('name')" />
                    <InputText v-model="form.reference" label="Project Reference" :error="fieldError('reference')" />
                    <div class="grid gap-4 sm:grid-cols-2">
                        <DateInput v-model="form.start_date" label="Start date" :error="fieldError('start_date')" />
                        <DateInput v-model="form.end_date" label="End date" :error="fieldError('end_date')" />
                    </div>
                    <InputText v-model="form.total_amount" label="Total Amount" type="number" :error="fieldError('total_amount')" />
                </div>

                <template #footer>
                    <div class="flex items-center gap-2">
                        <Button type="submit" variant="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</Button>
                        <Button type="button" :href="routeUrl('customerProjects.list')" @click="router.push(routeUrl('customerProjects.list'))">Cancel</Button>
                    </div>
                </template>
            </FullWidthBox>

            <FullWidthBox title="Customers" :collapsible="false">
                <AsyncSelect
                    :url="customersUrl"
                    label="Add customer"
                    placeholder="Search customers…"
                    :error="fieldError('customers')"
                    clear-on-select
                    @change="addCustomer"
                />

                <ul v-if="selectedCustomers.length" class="mt-3 space-y-1.5">
                    <li
                        v-for="customer in selectedCustomers"
                        :key="customer.id"
                        class="flex items-center justify-between rounded border border-gray-200 px-3 py-1.5 text-sm"
                    >
                        <span>{{ customer.name }}</span>
                        <button type="button" class="text-gray-400 hover:text-red-600" @click="removeCustomer(customer.id)">×</button>
                    </li>
                </ul>
                <p v-else class="mt-3 text-sm text-gray-400">No customers added yet.</p>
            </FullWidthBox>
        </form>
    </AppLayout>
</template>
