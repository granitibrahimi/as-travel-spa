<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import InputText from '../../../components/Form/InputText.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

// GET/POST/PUT /users/employees[/:id] — the employee, optionally linked to a user.
// POST/PUT/DELETE /users/employees/:id/contracts[/:contractId] — their contracts:
// start/end (no end = the active one), monthly net base salary, with bonuses.
// Contracts never overlap; "with bonuses" needs a linked user (bonuses are
// counted from that user's invoices).
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const id = route.params.id ?? null;
const isEdit = Boolean(id);
const canEdit = computed(() => auth.can(isEdit ? 'employees.edit' : 'employees.create'));

const fields = ['first_name', 'last_name', 'personal_number', 'id_issued_by', 'address', 'phone_number', 'email', 'bank', 'bank_account_number'];
const form = reactive({ ...Object.fromEntries(fields.map((field) => [field, ''])), user_id: null });
const linkedUser = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(! isEdit);

const contracts = ref([]);
const emptyContract = () => ({ id: null, starts_on: '', ends_on: '', base_salary: null, with_bonuses: false });
const contractForm = reactive(emptyContract());
const contractErrors = ref({});
const savingContract = ref(false);
const contractToDelete = ref(null);
const deletingContract = ref(false);

const firstError = (error) => Object.fromEntries(
    Object.entries(error.response?.data?.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
);

async function fetchEmployee() {
    const employee = castResource((await api.get(`/users/employees/${id}`)).data);

    for (const field of fields) {
        form[field] = employee[field] ?? '';
    }

    form.user_id = employee.user?.id ?? null;
    linkedUser.value = employee.user;
    contracts.value = employee.contracts;
    loaded.value = true;
}

onMounted(() => {
    if (isEdit) {
        fetchEmployee();
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        if (isEdit) {
            await api.put(`/users/employees/${id}`, form);
            notifications.push({ type: 'success', message: 'Employee saved.' });
        } else {
            const { id: newId } = castMutation((await api.post('/users/employees', form)).data);
            // Straight to the edit page so the first contract can be added.
            router.push(routeUrl('employees.edit', newId));
        }
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = firstError(error);
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}

function editContract(contract) {
    Object.assign(contractForm, { ...contract, ends_on: contract.ends_on ?? '' });
    contractErrors.value = {};
}

function resetContract() {
    Object.assign(contractForm, emptyContract());
    contractErrors.value = {};
}

async function saveContract() {
    if (savingContract.value) {
        return;
    }

    savingContract.value = true;
    contractErrors.value = {};

    const payload = {
        starts_on: contractForm.starts_on,
        ends_on: contractForm.ends_on || null,
        base_salary: contractForm.base_salary,
        with_bonuses: contractForm.with_bonuses,
    };

    try {
        await (contractForm.id
            ? api.put(`/users/employees/${id}/contracts/${contractForm.id}`, payload)
            : api.post(`/users/employees/${id}/contracts`, payload));
        resetContract();
        await fetchEmployee();
    } catch (error) {
        if (error.response?.status === 422) {
            contractErrors.value = firstError(error);
        } else {
            throw error;
        }
    } finally {
        savingContract.value = false;
    }
}

async function deleteContract() {
    if (deletingContract.value) {
        return;
    }

    deletingContract.value = true;

    try {
        await api.delete(`/users/employees/${id}/contracts/${contractToDelete.value.id}`);
        contractToDelete.value = null;
        resetContract();
        await fetchEmployee();
    } finally {
        deletingContract.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit employee' : 'New employee'">
        <Loader v-if="! loaded" />

        <div v-else class="space-y-6">
            <form class="space-y-6" @submit.prevent="submit">
                <FullWidthBox title="Employee" :collapsible="false">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputText v-model="form.first_name" label="Name *" :error="errors.first_name" :disabled="! canEdit" />
                        <InputText v-model="form.last_name" label="Surname *" :error="errors.last_name" :disabled="! canEdit" />
                        <InputText v-model="form.personal_number" label="Personal Nr." :error="errors.personal_number" :disabled="! canEdit" />
                        <InputText v-model="form.id_issued_by" label="ID issued by" :error="errors.id_issued_by" :disabled="! canEdit" />
                        <div class="md:col-span-2">
                            <InputText v-model="form.address" label="Address" :error="errors.address" :disabled="! canEdit" />
                        </div>
                        <InputText v-model="form.phone_number" label="Phone number" :error="errors.phone_number" :disabled="! canEdit" />
                        <InputText v-model="form.email" label="Email address" :error="errors.email" :disabled="! canEdit" />
                        <InputText v-model="form.bank" label="Bank" :error="errors.bank" :disabled="! canEdit" />
                        <InputText v-model="form.bank_account_number" label="Bank account number" :error="errors.bank_account_number" :disabled="! canEdit" />
                        <div class="md:col-span-2">
                            <AsyncSelect
                                v-model="form.user_id"
                                url="/users/users/autosuggest"
                                label="User"
                                placeholder="Search user…"
                                :initial-option="linkedUser"
                                :error="errors.user_id"
                                :disabled="! canEdit"
                            />
                            <p v-if="! errors.user_id" class="mt-1 text-xs text-gray-500">Link the user this employee works as in the platform — needed for bonuses, which are counted from that user's invoices.</p>
                        </div>
                    </div>
                </FullWidthBox>

                <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                    <RouterLink :to="routeUrl('employees.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                        Back
                    </RouterLink>
                    <Button v-if="canEdit" type="submit" variant="primary" :disabled="processing">
                        {{ processing ? 'Saving…' : (isEdit ? 'Save employee' : 'Create employee') }}
                    </Button>
                </footer>
            </form>

            <FullWidthBox v-if="isEdit" title="Contracts" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Start date</th>
                                <th class="border border-gray-300 px-2 py-2">End date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Base salary (net)</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">With bonuses</th>
                                <th v-if="auth.can('employees.edit')" class="border border-gray-300 px-2 py-2 text-center" style="width: 150px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="contracts.length === 0">
                                <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No contracts yet — without an active contract the employee isn't on the payroll.</td>
                            </tr>
                            <tr v-for="contract in contracts" :key="contract.id" :class="contract.id === contractForm.id ? 'bg-yellow-50' : 'hover:bg-gray-50'">
                                <td class="border border-gray-300 px-2 py-2">{{ contract.starts_on }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span v-if="contract.ends_on">{{ contract.ends_on }}</span>
                                    <span v-else class="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(contract.base_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ contract.with_bonuses ? 'Yes' : 'No' }}</td>
                                <td v-if="auth.can('employees.edit')" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="text-sm text-blue-600 hover:underline" @click="editContract(contract)">Edit</button>
                                    <button type="button" class="ml-3 text-sm text-red-600 hover:underline" @click="contractToDelete = contract">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <form v-if="auth.can('employees.edit')" class="mt-4 rounded border border-gray-200 bg-gray-50 p-4" @submit.prevent="saveContract">
                    <h3 class="mb-3 text-sm font-semibold text-gray-700">{{ contractForm.id ? 'Edit contract' : 'New contract' }}</h3>
                    <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-4">
                        <DateInput v-model="contractForm.starts_on" label="Start date *" :error="contractErrors.starts_on" />
                        <DateInput v-model="contractForm.ends_on" label="End date" :error="contractErrors.ends_on" />
                        <InputNumber v-model="contractForm.base_salary" label="Base salary (net) *" :error="contractErrors.base_salary" />
                        <div class="pt-7">
                            <NiceCheckbox v-model="contractForm.with_bonuses" label="With bonuses" :error="contractErrors.with_bonuses" />
                        </div>
                    </div>
                    <p class="mt-2 text-xs text-gray-500">Leave the end date empty for the active contract. To change the salary, end the current contract and add a new one from the next day.</p>
                    <div class="mt-3 flex justify-end gap-2">
                        <Button v-if="contractForm.id" type="button" @click="resetContract">Cancel</Button>
                        <Button type="submit" variant="primary" :loading="savingContract">{{ contractForm.id ? 'Save contract' : 'Add contract' }}</Button>
                    </div>
                </form>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="Boolean(contractToDelete)"
            title="Delete contract?"
            :message="contractToDelete ? `The contract from ${contractToDelete.starts_on} will be deleted. Saved payrolls keep their figures.` : ''"
            confirm-label="Yes, delete"
            :processing="deletingContract"
            @confirm="deleteContract"
            @cancel="contractToDelete = null"
        />
    </AppLayout>
</template>
