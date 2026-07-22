<script setup>
import {computed, ref, watch} from 'vue';
import api from '../../../helpers/api';
import Button from '../../../components/Button.vue';
import Select from '../../../components/Form/Select.vue';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';

const props = defineProps({
    invoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'uploaded']);

const formOptions = useFormOptionsStore();
const types = computed(() => toOptions(formOptions.customerInvoiceDocumentTypes));
const type = ref(null);
const file = ref(null);
const uploading = ref(false);
const error = ref('');

function onFileChange(event) {
    file.value = event.target.files?.[0] ?? null;
}

async function upload() {
    if (uploading.value || !props.invoice) {
        return;
    }

    if (!type.value || !file.value) {
        error.value = 'Choose a document type and a PDF file.';
        return;
    }

    uploading.value = true;
    error.value = '';

    try {
        const payload = new FormData();
        payload.append('type', type.value);
        payload.append('document', file.value);

        await api.post(`/customers/invoices/${props.invoice.id}/documents`, payload);
        emit('uploaded');
        emit('close');
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not upload the document.';
    } finally {
        uploading.value = false;
    }
}
</script>

<template>
    <Teleport to="body">
        <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/50" @click="emit('close')" />

            <div
                role="dialog"
                aria-modal="true"
                class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                :class="{ 'pointer-events-none opacity-75': uploading }"
            >
                <h3 class="text-lg font-semibold text-gray-900">
                    Add document<span v-if="invoice"> · {{ invoice.gen_id }}</span>
                </h3>

                <div class="mt-4 space-y-3">
                    <Select v-model="type" label="Type" :options="types" placeholder="Choose type…" />
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">PDF file</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            class="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1 file:text-sm hover:file:bg-gray-100"
                            @change="onFileChange"
                        >
                    </div>
                    <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <Button :disabled="uploading" @click="emit('close')">Cancel</Button>
                    <Button variant="primary" :loading="uploading" @click="upload">Upload</Button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
