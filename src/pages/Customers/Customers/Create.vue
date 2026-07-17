<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const router = useRouter();
const formOptions = useFormOptionsStore();

// Customer types come from the shared form-options store.
const types = computed(() => toOptions(formOptions.customerTypes));
const PRIVATE_TYPE = 2; // mirrors CustomerTypeEnum::Private on the platform

const form = reactive({
    type: null,
    name: '',
    first_name: '',
    last_name: '',
    unique_id: '',
    email: '',
    phone: '',
    working_info: '',
    vat_nr: '',
    address: '',
});

const isPrivate = computed(() => form.type === PRIVATE_TYPE);

const errors = ref({});
const processing = ref(false);

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/customers', form);
        const created = data.data ?? data;
        router.push(`/customers/${created.id}`);
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
    <AppLayout title="New customer">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Customer details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.type" :options="types" label="Type *" :error="errors.type" />
                    <InputText v-model="form.unique_id" label="Unique ID *" :error="errors.unique_id" />

                    <template v-if="isPrivate">
                        <InputText v-model="form.first_name" label="First name *" :error="errors.first_name" />
                        <InputText v-model="form.last_name" label="Last name *" :error="errors.last_name" />
                    </template>

                    <InputText v-if="!isPrivate" v-model="form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="form.vat_nr" label="VAT number" :error="errors.vat_nr" />
                    <InputText v-model="form.email" type="email" label="Email *" :error="errors.email" />
                    <InputText v-model="form.phone" label="Phone *" :error="errors.phone" />
                    <InputText v-model="form.working_info" label="Working info" :error="errors.working_info" />
                </div>

                <div class="mt-4">
                    <Textarea v-model="form.address" label="Address" :error="errors.address" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/customers" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create customer' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
