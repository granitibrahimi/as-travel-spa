<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({
    type: null,
    account_id: null,
    name: '',
    description: '',
    incoming: false,
    outgoing: false,
    allow_withdraw: false,
    allow_deposit: false,
});
const types = ref([]);
const accounts = ref([]);
const errors = ref({});
const processing = ref(false);
const ready = ref(false);

onMounted(async () => {
    const [{ data: options }, method] = await Promise.all([
        api.get('/payment-methods/form-options'),
        isEdit ? api.get(`/payment-methods/${id}`).then((r) => r.data.data ?? r.data) : Promise.resolve(null),
    ]);

    types.value = options.types;
    accounts.value = options.accounts;

    if (method) {
        Object.assign(form, {
            type: method.type,
            account_id: method.account_id,
            name: method.name ?? '',
            description: method.description ?? '',
            incoming: method.incoming ?? false,
            outgoing: method.outgoing ?? false,
            allow_withdraw: method.allow_withdraw ?? false,
            allow_deposit: method.allow_deposit ?? false,
        });
    } else {
        form.type = types.value[0]?.value ?? null;
    }

    ready.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/payment-methods/${id}`, form) : api.post('/payment-methods', form));
        router.push('/payment-methods');
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
    <AppLayout :title="isEdit ? 'Edit payment method' : 'New payment method'">
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Payment method details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <Select v-model="form.type" :options="types" label="Type *" :placeholder="null" :error="errors.type" />
                    <div class="md:col-span-2">
                        <SearchSelect v-model="form.account_id" :options="accounts" label="Account *" placeholder="Search account…" :error="errors.account_id" />
                    </div>
                    <div class="md:col-span-2">
                        <Textarea v-model="form.description" label="Description *" :error="errors.description" />
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NiceCheckbox v-model="form.incoming" label="Incoming" />
                    <NiceCheckbox v-model="form.outgoing" label="Outgoing" />
                    <NiceCheckbox v-model="form.allow_deposit" label="Allow deposit" />
                    <NiceCheckbox v-model="form.allow_withdraw" label="Allow withdraw" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/payment-methods" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update payment method' : 'Create payment method') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
