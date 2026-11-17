<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../helpers/api';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import InputText from '../../components/Form/InputText.vue';
import Textarea from '../../components/Form/Textarea.vue';
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import Loader from '../../components/Loader.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';

// The instructions the AS Travel assistant answers from. Only active ones go
// into its prompt, in sort order.
const instructions = ref(null);

async function load() {
    const { data } = await api.get('/ai-chat/instructions');
    instructions.value = castResource(data);
}

onMounted(load);

const activeCount = computed(() => (instructions.value ?? []).filter((row) => row.is_active).length);

const editor = ref(false);
const editingId = ref(null);
const form = reactive({ title: '', content: '', is_active: true, sort_order: 0 });
const errors = ref({});
const saving = ref(false);

function openEditor(row = null) {
    editingId.value = row?.id ?? null;
    Object.assign(form, {
        title: row?.title ?? '',
        content: row?.content ?? '',
        is_active: row ? Boolean(row.is_active) : true,
        sort_order: row?.sort_order ?? ((instructions.value ?? []).reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0) + 1),
    });
    errors.value = {};
    editor.value = true;
}

function firstErrors(error) {
    return Object.fromEntries(
        Object.entries(error.response?.data?.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
    );
}

async function save() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    errors.value = {};

    try {
        const payload = { ...form, sort_order: Number(form.sort_order) || 0 };

        if (editingId.value) {
            await api.put(`/ai-chat/instructions/${editingId.value}`, payload);
        } else {
            await api.post('/ai-chat/instructions', payload);
        }
        editor.value = false;
        await load();
    } catch (error) {
        if (error.response?.status !== 422) {
            throw error;
        }
        errors.value = firstErrors(error);
    } finally {
        saving.value = false;
    }
}

async function toggle(row) {
    await api.put(`/ai-chat/instructions/${row.id}`, { title: row.title, content: row.content, is_active: ! row.is_active, sort_order: row.sort_order });
    await load();
}

const deleting = ref(null);
const deleteBusy = ref(false);

async function confirmDelete() {
    deleteBusy.value = true;

    try {
        await api.delete(`/ai-chat/instructions/${deleting.value.id}`);
        deleting.value = null;
        await load();
    } finally {
        deleteBusy.value = false;
    }
}
</script>

<template>
    <AppLayout title="AI Chat Instructions">
        <FullWidthBox title="AI Chat Instructions" :collapsible="false">
            <template #actions>
                <Button size="sm" variant="primary" @click="openEditor()">New instruction</Button>
            </template>

            <p class="mb-4 text-sm text-gray-500">
                The AS Travel assistant in the agents' app answers only from the active instructions below.
                Write each one as plain text or Markdown: prices, procedures, office rules, supplier notes.
            </p>

            <Loader v-if="instructions === null" />

            <div v-else-if="instructions.length === 0" class="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
                <p class="text-sm text-gray-500">No instructions yet. Until you add one, the assistant tells agents it has nothing to answer from.</p>
                <Button class="mt-4" variant="primary" @click="openEditor()">Add the first instruction</Button>
            </div>

            <template v-else>
                <p class="mb-2 text-xs text-gray-400">{{ activeCount }} of {{ instructions.length }} active</p>

                <div class="space-y-3">
                    <article
                        v-for="row in instructions"
                        :key="row.id"
                        class="rounded-lg border bg-white p-4"
                        :class="row.is_active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'"
                    >
                        <header class="flex flex-wrap items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="font-semibold text-gray-900">
                                    <span class="mr-1 text-xs font-normal text-gray-400">#{{ row.sort_order }}</span>
                                    {{ row.title }}
                                </h3>
                                <p class="mt-0.5 text-xs text-gray-400">
                                    <span v-if="! row.is_active" class="mr-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">Inactive</span>
                                    Updated {{ row.updated_at }}<span v-if="row.updated_by"> by {{ row.updated_by }}</span>
                                </p>
                            </div>
                            <div class="flex shrink-0 gap-2">
                                <Button size="sm" @click="toggle(row)">{{ row.is_active ? 'Deactivate' : 'Activate' }}</Button>
                                <Button size="sm" @click="openEditor(row)">Edit</Button>
                                <Button size="sm" variant="danger" @click="deleting = row">Delete</Button>
                            </div>
                        </header>
                        <p class="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-gray-700">{{ row.content }}</p>
                    </article>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="editor"
            :title="editingId ? 'Edit instruction' : 'New instruction'"
            confirm-label="Save"
            size="lg"
            :processing="saving"
            :confirm-disabled="! form.title.trim() || ! form.content.trim()"
            @confirm="save"
            @cancel="editor = false"
        >
            <div class="mt-4 space-y-4">
                <InputText v-model="form.title" label="Title" :error="errors.title" />
                <Textarea v-model="form.content" label="Instruction" :rows="10" :error="errors.content" />
                <div class="flex flex-wrap items-end gap-6">
                    <div class="w-32">
                        <InputText v-model="form.sort_order" type="number" label="Order" :error="errors.sort_order" />
                    </div>
                    <NiceCheckbox v-model="form.is_active" label="Active" />
                </div>
            </div>
        </ConfirmDialog>

        <ConfirmDialog
            :show="deleting !== null"
            title="Delete this instruction?"
            :message="deleting ? `“${deleting.title}” will no longer be used by the assistant.` : ''"
            confirm-label="Delete"
            confirm-variant="danger"
            :processing="deleteBusy"
            @confirm="confirmDelete"
            @cancel="deleting = null"
        />
    </AppLayout>
</template>
