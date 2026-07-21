<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({ name: '' });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/products/${id}`);
        form.name = castResource(data).name ?? '';
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await (isEdit ? api.put(`/products/${id}`, form) : api.post('/products', form));
        router.push(routeUrl('products.list'));
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
    <AppLayout :title="isEdit ? 'Edit product' : 'New product'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Product details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:max-w-md">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('products.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update product' : 'Create product') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
