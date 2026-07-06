<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({
    name: '',
    for_sales: false,
    for_purchases: false,
    excel_column_id: null,
    qb_id: null,
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/tax-types/${id}`);
        const taxType = data.data ?? data;
        Object.assign(form, {
            name: taxType.name ?? '',
            for_sales: taxType.for_sales ?? false,
            for_purchases: taxType.for_purchases ?? false,
            excel_column_id: taxType.excel_column_id ?? null,
            qb_id: taxType.qb_id ?? null,
        });
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/tax-types/${id}`, form) : api.post('/tax-types', form));
        router.push('/tax-types');
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
    <AppLayout :title="isEdit ? 'Edit tax type' : 'New tax type'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Tax type details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="form.excel_column_id" type="number" label="Excel column *" :error="errors.excel_column_id" />
                    <InputText v-model="form.qb_id" type="number" label="QuickBooks ID" :error="errors.qb_id" />
                </div>

                <div class="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                    <NiceCheckbox v-model="form.for_sales" label="For sales" :error="errors.for_sales" />
                    <NiceCheckbox v-model="form.for_purchases" label="For purchases" :error="errors.for_purchases" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/tax-types" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update tax type' : 'Create tax type') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
