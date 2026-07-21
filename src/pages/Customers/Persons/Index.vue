<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const formOptions = useFormOptionsStore();

const apiResponse = ref(null);
const loading = ref(false);

const search = ref('');
const classification = ref('');
const gender = ref('');

// Enum options for the filters — from the shared form-options store.
const classifications = computed(() => toOptions(formOptions.personClassifications));
const genders = computed(() => toOptions(formOptions.personGenders));

// Row picked via the ⋯ button — opens the actions side overlay.
const selected = ref(null);
const personToDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchPersons(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/customers/persons', {
            signal: controller.signal,
            params: {
                q: search.value || undefined,
                classification: classification.value || undefined,
                gender: gender.value || undefined,
                page,
            },
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

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/persons/${personToDelete.value.id}`);
        personToDelete.value = null;
        await fetchPersons(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

onMounted(async () => {
    await fetchPersons();
});
</script>

<template>
    <AppLayout title="Travelers" fluid>
        <FullWidthBox title="Travelers" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5" @submit.prevent="fetchPersons()">
                <div class="md:col-span-2">
                    <InputText v-model="search" label="Search" placeholder="Name, email, phone, passport…" />
                </div>
                <Select v-model="gender" :options="genders" label="Gender" placeholder="All" />
                <Select v-model="classification" :options="classifications" label="Classification" placeholder="All" />
                <div class="flex items-end">
                    <Button type="submit" variant="primary">Filter</Button>
                </div>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Full name</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Gender</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Classification</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Email</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Passport</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">No AI</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No travelers found.</td>
                        </tr>
                        <tr v-for="person in (loading ? [] : apiResponse?.data ?? [])" :key="person.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ person.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('persons.show', person.id)" class="hover:text-red-700 hover:underline">{{ person.full_name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ person.gender_label }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ person.classification_label ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ person.email || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ person.passport_number || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span
                                    class="rounded px-2 py-0.5 text-xs font-medium"
                                    :class="person.no_ai ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
                                >
                                    {{ person.no_ai ? 'Yes' : 'No' }}
                                </span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Traveler actions"
                                    @click="selected = person"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="1.8" />
                                        <circle cx="12" cy="12" r="1.8" />
                                        <circle cx="12" cy="19" r="1.8" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchPersons" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('persons.create')"
                    :to="routeUrl('persons.create')"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + New traveler
                </RouterLink>
            </template>
        </FullWidthBox>

        <!-- Per-traveler actions -->
        <ActionsOverlay
            :show="Boolean(selected)"
            :title="selected?.full_name"
            :subtitle="selected ? `#${selected.id}` : ''"
            @close="selected = null"
        >
            <div v-if="selected" class="space-y-3">
                <RouterLink
                    :to="routeUrl('persons.show', selected.id)"
                    class="block w-full rounded border border-gray-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-gray-50"
                >
                    View traveler
                </RouterLink>
                <RouterLink
                    v-if="auth.can('persons.edit')"
                    :to="routeUrl('persons.edit', selected.id)"
                    class="block w-full rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Edit
                </RouterLink>
                <button
                    v-if="auth.can('persons.delete')"
                    type="button"
                    class="block w-full rounded border border-red-200 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                    @click="personToDelete = selected; selected = null;"
                >
                    Delete
                </button>
            </div>
        </ActionsOverlay>

        <ConfirmDialog
            :show="Boolean(personToDelete)"
            title="Delete traveler?"
            :message="personToDelete ? `${personToDelete.full_name} and their contact references will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="personToDelete = null"
        />
    </AppLayout>
</template>
