<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import api from '../helpers/api';
import { downloadFile } from '../helpers/download';
import FullWidthBox from './FullWidthBox.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import AddDocumentModal from './AddDocumentModal.vue';

const props = defineProps({
    // Numeric DOCUMENT_ENTITY value.
    entity: { type: Number, required: true },
    // Owning row id.
    id: { type: [Number, String], default: null },
    // May the current user upload / delete?
    canManage: { type: Boolean, default: false },
    // May the current user list / download? (list fetch is skipped when false)
    canView: { type: Boolean, default: true },
    title: { type: String, default: 'Documents' },
    // Optional [{ value, label }] for the "Type" picker on upload.
    categoryOptions: { type: Array, default: () => [] },
    // Optional { [categoryValue]: label } to render the category column.
    categoryLabels: { type: Object, default: () => ({}) },
    // Render the built-in "Add document" button (header + empty state). Set
    // false when the page drives the upload from its own actions menu and calls
    // the exposed `openUpload()` instead.
    showAddButton: { type: Boolean, default: true },
});

const documents = ref([]);
const loaded = ref(false);
const modalOpen = ref(false);
const toDelete = ref(null);
const deleting = ref(false);

const showCategory = computed(() => props.categoryOptions.length > 0);

async function fetchDocuments() {
    if (!props.canView || props.id == null) {
        return;
    }

    const { data } = await api.get('/documents', { params: { entity: props.entity, id: props.id } });
    documents.value = data.data ?? [];
    loaded.value = true;
}

function categoryLabel(value) {
    return props.categoryLabels[value] ?? '—';
}

async function download(document) {
    await downloadFile(`/documents/${document.id}`, {
        fallbackName: document.name ?? `document-${document.id}.pdf`,
    });
}

async function confirmDelete() {
    if (deleting.value || !toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/documents/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchDocuments();
    } finally {
        deleting.value = false;
    }
}

function openUpload() {
    modalOpen.value = true;
}

onMounted(fetchDocuments);
watch(() => [props.entity, props.id], fetchDocuments);

defineExpose({ refresh: fetchDocuments, openUpload });
</script>

<template>
    <div v-if="canView">
        <!-- The list card is shown only when there is something to list. -->
        <FullWidthBox v-if="documents.length" :title="title" :collapsible="false" class="mt-6">
            <template v-if="canManage && showAddButton" #actions>
                <button
                    type="button"
                    class="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    @click="modalOpen = true"
                >
                    Add document
                </button>
            </template>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                    <tr class="border-b text-left text-gray-500">
                        <th class="border border-gray-300 px-2 py-2">ID</th>
                        <th v-if="showCategory" class="border border-gray-300 px-2 py-2">Type</th>
                        <th class="border border-gray-300 px-2 py-2">Description</th>
                        <th class="border border-gray-300 px-2 py-2">Uploaded by</th>
                        <th class="border border-gray-300 px-2 py-2">Uploaded</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="document in documents" :key="document.id" class="border-b last:border-0">
                        <td class="border border-gray-300 px-2 py-2">{{ document.id }}</td>
                        <td v-if="showCategory" class="border border-gray-300 px-2 py-2">{{ categoryLabel(document.category) }}</td>
                        <td class="border border-gray-300 px-2 py-2 whitespace-pre-line text-gray-600">{{ document.description || '—' }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ document.user?.name ?? '—' }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ document.created_at }}</td>
                        <td class="border border-gray-300 px-2 py-2">
                            <div class="flex justify-end gap-2">
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                                    @click="download(document)"
                                >
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                                    </svg>
                                    PDF
                                </button>
                                <button
                                    v-if="canManage"
                                    type="button"
                                    class="rounded border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                                    @click="toDelete = document"
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <!-- Empty state: no card, just the affordance to attach the first file. -->
        <div v-else-if="canManage && showAddButton && loaded" class="mt-6">
            <button
                type="button"
                class="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                @click="modalOpen = true"
            >
                Add document
            </button>
        </div>

        <AddDocumentModal
            :entity="entity"
            :id="id"
            :show="modalOpen"
            :category-options="categoryOptions"
            @close="modalOpen = false"
            @uploaded="fetchDocuments"
        />

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete document?"
            message="This file will be permanently deleted."
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </div>
</template>
