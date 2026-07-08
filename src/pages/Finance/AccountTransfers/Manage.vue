<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const accounts = ref([]);
const errors = ref({});
const processing = ref(false);
const ready = ref(false);
const genId = ref(null);
const locked = ref(false);

const form = reactive({
    from_account_id: null,
    to_account_id: null,
    amount: null,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
});

onMounted(async () => {
    const [{ data: options }, transfer] = await Promise.all([
        api.get('/account-transfers/form-options'),
        isEdit ? api.get(`/account-transfers/${id}`).then((r) => r.data.data ?? r.data) : Promise.resolve(null),
    ]);

    accounts.value = options.accounts;

    if (transfer) {
        genId.value = transfer.gen_id;
        locked.value = ! transfer.editable;
        form.from_account_id = transfer.from_account_id;
        form.to_account_id = transfer.to_account_id;
        form.amount = transfer.amount;
        form.date = transfer.on_date_input;
        form.notes = transfer.notes ?? '';
    }

    ready.value = true;
});

async function submit() {
    if (processing.value || locked.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await (isEdit
            ? api.put(`/account-transfers/${id}`, form)
            : api.post('/account-transfers', form));
        router.push(`/account-transfers/${data.id}`);
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
    <AppLayout :title="isEdit ? `Edit ${genId ?? 'transfer'}` : 'New transfer'" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <p v-if="locked" class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                This transfer backs approved cash and cannot be edited.
            </p>

            <FullWidthBox title="Transfer" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SearchSelect v-model="form.from_account_id" :options="accounts" placeholder="From account…" label="From account *" :error="errors.from_account_id" />
                    <SearchSelect v-model="form.to_account_id" :options="accounts" placeholder="To account…" label="To account *" :error="errors.to_account_id" />
                    <InputText v-model="form.amount" type="number" step="0.01" label="Amount *" :error="errors.amount" />
                    <InputText v-model="form.date" type="date" label="Date *" :error="errors.date" />
                    <div class="md:col-span-2">
                        <Textarea v-model="form.notes" label="Notes" :error="errors.notes" />
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/account-transfers" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || locked">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update transfer' : 'Create transfer') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
