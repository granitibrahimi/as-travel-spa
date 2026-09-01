<script setup>
import { ref, watch } from 'vue';
import api from '../helpers/api';
import Button from './Button.vue';
import Select from './Form/Select.vue';

const props = defineProps({
    // Numeric DOCUMENT_ENTITY value.
    entity: { type: Number, required: true },
    // Owning row id.
    id: { type: [Number, String], default: null },
    show: { type: Boolean, default: false },
    // Optional [{ value, label }] — when set, a category must be picked.
    categoryOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'uploaded']);

const category = ref(null);
const description = ref('');
const file = ref(null);
const uploading = ref(false);
const error = ref('');

watch(() => props.show, (open) => {
    if (open) {
        category.value = null;
        description.value = '';
        file.value = null;
        error.value = '';
    }
});

function onFileChange(event) {
    file.value = event.target.files?.[0] ?? null;
}

async function upload() {
    if (uploading.value || props.id == null) {
        return;
    }

    if (!file.value) {
        error.value = 'Choose a PDF file.';
        return;
    }

    if (props.categoryOptions.length && !category.value) {
        error.value = 'Choose a document type.';
        return;
    }

    uploading.value = true;
    error.value = '';

    try {
        const payload = new FormData();
        payload.append('entity', props.entity);
        payload.append('id', props.id);
        payload.append('document', file.value);

        if (category.value) {
            payload.append('category', category.value);
        }

        if (description.value.trim()) {
            payload.append('description', description.value.trim());
        }

        await api.post('/documents', payload);
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
                <h3 class="text-lg font-semibold text-gray-900">Add document</h3>

                <div class="mt-4 space-y-3">
                    <Select
                        v-if="categoryOptions.length"
                        v-model="category"
                        label="Type"
                        :options="categoryOptions"
                        placeholder="Choose type…"
                    />
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">PDF file</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            class="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1 file:text-sm hover:file:bg-gray-100"
                            @change="onFileChange"
                        >
                    </div>
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Description <span class="text-gray-400">(optional)</span></label>
                        <textarea
                            v-model="description"
                            rows="2"
                            maxlength="1000"
                            class="block w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                        />
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
