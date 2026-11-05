<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import InputText from '../../../components/Form/InputText.vue';
import Loader from '../../../components/Loader.vue';

// Departments of an AQP customer, shown on the customer page. Users can add a
// department and rename one in a small dialog. Invoices of the customer can be
// assigned to a department (on the invoice create and show pages).
const props = defineProps({
    customer: { type: Object, required: true },
});

const auth = useAuthStore();
const canCreate = computed(() => auth.can('customerDepartments.create'));
const canEdit = computed(() => auth.can('customerDepartments.edit'));

const departments = ref(null);

async function load() {
    const { data } = await api.get(`/customers/customers/${props.customer.id}/departments`);
    departments.value = castResource(data) ?? [];
}

onMounted(load);

// Create / rename dialog. `editing` is null when the dialog is closed, `{}`
// for a new department, or the department row being renamed.
const editing = ref(null);
const name = ref('');
const error = ref('');
const saving = ref(false);

function openCreate() {
    editing.value = {};
    name.value = '';
    error.value = '';
}

function openEdit(department) {
    editing.value = department;
    name.value = department.name;
    error.value = '';
}

function close() {
    editing.value = null;
}

async function save() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    error.value = '';

    try {
        if (editing.value.id) {
            await api.put(`/customers/departments/${editing.value.id}`, { name: name.value });
        } else {
            await api.post(`/customers/customers/${props.customer.id}/departments`, { name: name.value });
        }

        editing.value = null;
        await load();
    } catch (e) {
        error.value = e.response?.data?.errors?.name?.[0] ?? e.response?.data?.message ?? 'Could not save the department.';
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <FullWidthBox title="Departments" :collapsible="false">
        <template v-if="canCreate" #actions>
            <button
                type="button"
                class="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                @click="openCreate"
            >
                + Department
            </button>
        </template>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                <tr class="text-left text-xs uppercase text-gray-500">
                    <th class="border border-gray-300 px-2 py-2">Name</th>
                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Invoices</th>
                    <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 150px;">Created at</th>
                    <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="! departments">
                    <td :colspan="canEdit ? 4 : 3" class="border border-gray-300 px-2 py-2"><Loader/></td>
                </tr>
                <tr v-else-if="departments.length === 0">
                    <td :colspan="canEdit ? 4 : 3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">
                        No departments yet.
                    </td>
                </tr>
                <tr v-for="department in departments ?? []" :key="department.id" class="hover:bg-gray-50">
                    <td class="border border-gray-300 px-2 py-2 font-medium">{{ department.name }}</td>
                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ department.invoices_count }}</td>
                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-500">{{ department.created_at }}</td>
                    <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            :aria-label="`Edit department ${department.name}`"
                            title="Edit"
                            @click="openEdit(department)"
                        >
                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                            </svg>
                        </button>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <ConfirmDialog
            :show="Boolean(editing)"
            :title="editing?.id ? 'Edit department' : 'New department'"
            confirm-label="Save"
            :processing="saving"
            @confirm="save"
            @cancel="close"
        >
            <div class="mt-4">
                <InputText v-model="name" label="Name" :error="error" autofocus/>
            </div>
        </ConfirmDialog>
    </FullWidthBox>
</template>
