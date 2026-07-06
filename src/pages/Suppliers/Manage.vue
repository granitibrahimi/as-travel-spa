<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Textarea from '../../components/Form/Textarea.vue';

const router = useRouter();

const form = reactive({
    name: '',
    unique_id: '',
    company_name: '',
    vat_nr: '',
    address: '',
    email: '',
    phone: '',
});

const errors = ref({});
const processing = ref(false);

// Creation goes through the JSON API; on success we route to the new supplier.
async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/suppliers', form);
        router.push(`/suppliers/${data.id}`);
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
    <AppLayout title="New supplier">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Supplier details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="form.unique_id" label="Unique ID *" :error="errors.unique_id" />
                    <InputText v-model="form.company_name" label="Company name" :error="errors.company_name" />
                    <InputText v-model="form.vat_nr" label="VAT number" :error="errors.vat_nr" />
                    <InputText v-model="form.email" type="email" label="Email" :error="errors.email" />
                    <InputText v-model="form.phone" label="Phone" :error="errors.phone" />
                </div>

                <div class="mt-4">
                    <Textarea v-model="form.address" label="Address" :error="errors.address" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/suppliers" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create supplier' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
