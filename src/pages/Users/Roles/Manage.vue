<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({
    name: '',
    description: '',
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/roles/${id}`);
        const role = data.data ?? data;
        Object.assign(form, {
            name: role.name ?? '',
            description: role.description ?? '',
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
        await (isEdit ? api.put(`/roles/${id}`, form) : api.post('/roles', form));
        router.push('/roles');
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
    <AppLayout :title="isEdit ? 'Edit role' : 'New role'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Role details" :collapsible="false">
                <div class="space-y-4">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <Textarea v-model="form.description" label="Description" :error="errors.description" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/roles" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update role' : 'Create role') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
