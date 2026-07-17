<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();

const customerId = route.params.id;

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
const loaded = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/customers/${customerId}`);
    const customer = data.data ?? data;
    Object.assign(form, {
        type: customer.type ?? null,
        name: customer.name ?? '',
        first_name: customer.first_name ?? '',
        last_name: customer.last_name ?? '',
        unique_id: customer.unique_id ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        working_info: customer.working_info ?? '',
        vat_nr: customer.vat_nr ?? '',
        address: customer.address ?? '',
    });
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/customers/${customerId}`, form);
        router.push(`/customers/${customerId}`);
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
    <AppLayout title="Edit customer">
        <Loader v-if="! loaded" />

        <form v-else class="space-y-6" @submit.prevent="submit">
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
                <RouterLink :to="`/customers/${customerId}`" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update customer' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
