<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({ name: '', code: '', taxes_included: false });
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (isEdit) {
        const { data } = await api.get(`/parent-destinations/${id}`);
        const parentDestination = data.data ?? data;
        Object.assign(form, {
            name: parentDestination.name ?? '',
            code: parentDestination.code ?? '',
            taxes_included: Boolean(parentDestination.taxes_included),
        });
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = { ...form, code: form.code.toUpperCase() };

    try {
        await (isEdit ? api.put(`/parent-destinations/${id}`, payload) : api.post('/parent-destinations', payload));
        router.push('/parent-destinations');
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
    <AppLayout :title="isEdit ? 'Edit parent destination' : 'New parent destination'">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Parent destination details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div class="md:col-span-2">
                        <InputText v-model="form.name" label="Name *" placeholder="e.g. MALDIVES" :error="errors.name" />
                    </div>
                    <div>
                        <InputText
                            v-model="form.code"
                            label="Code *"
                            placeholder="e.g. MLE"
                            maxlength="8"
                            class="uppercase"
                            :error="errors.code"
                        />
                        <p class="mt-1 text-xs text-gray-500">Used as the static offer code prefix (e.g. MLE-001).</p>
                    </div>
                </div>

                <NiceCheckbox
                    v-model="form.taxes_included"
                    label="Taxes included"
                    :error="errors.taxes_included"
                    class="mt-4"
                />
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/parent-destinations" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update parent destination' : 'Create parent destination') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
