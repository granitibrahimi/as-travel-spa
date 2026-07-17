<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    role_id: null,
    cash_account_id: null,
    password: '',
    password_confirmation: '',
});
const formOptions = useFormOptionsStore();
const roles = computed(() => toOptions(formOptions.userRoles));
const cashAccounts = computed(() => toOptions(formOptions.cashAccounts));
const errors = ref({});
const processing = ref(false);
const ready = ref(false);

onMounted(async () => {
    const user = isEdit
        ? await api.get(`/users/${id}`).then((r) => r.data.data ?? r.data)
        : null;

    if (user) {
        Object.assign(form, {
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            phone_number: user.phone_number ?? '',
            email: user.email ?? '',
            role_id: user.role_id ?? null,
            cash_account_id: user.cash_account_id ?? null,
        });
    }

    ready.value = true;
});

async function submit() {
    if (processing.value) return;

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/users/${id}`, form) : api.post('/users', form));
        router.push('/users');
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit user' : 'New user'">
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="User details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.first_name" label="First name *" :error="errors.first_name" />
                    <InputText v-model="form.last_name" label="Last name *" :error="errors.last_name" />
                    <InputText v-model="form.phone_number" label="Phone number *" :error="errors.phone_number" />
                    <InputText v-model="form.email" type="email" label="Email *" :error="errors.email" />
                    <Select v-model="form.role_id" :options="roles" label="Role *" :error="errors.role_id" />
                    <SearchSelect v-model="form.cash_account_id" :options="cashAccounts" label="Cash account" placeholder="Search account…" :error="errors.cash_account_id" />
                </div>
            </FullWidthBox>

            <FullWidthBox :title="isEdit ? 'Change password' : 'Password'" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.password" type="password" :label="isEdit ? 'New password' : 'Password *'" :error="errors.password" />
                    <InputText v-model="form.password_confirmation" type="password" label="Confirm password" :error="errors.password_confirmation" />
                </div>
                <p v-if="isEdit" class="mt-2 text-xs text-gray-500">Leave blank to keep the current password.</p>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/users" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update user' : 'Create user') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
