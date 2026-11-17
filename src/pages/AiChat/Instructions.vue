<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
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

// The assistant's knowledge entries. Publishing uploads an entry to the bot's
// OpenAI vector store in the background; the assistant keeps answering from
// the published version until a new one is indexed.
const entries = ref(null);

const STATUS = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
    indexing: { label: 'Indexing…', cls: 'bg-amber-100 text-amber-700' },
    published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
};

async function load() {
    const { data } = await api.get('/ai-chat/instructions');
    // An empty list comes back without `data` (the API drops empty values), so default to [].
    const rows = castResource(data);
    entries.value = Array.isArray(rows) ? rows : [];
}

// While something is indexing, refresh every few seconds so the status moves on by itself.
let timer = null;
const indexing = computed(() => (entries.value ?? []).some((row) => row.status === 'indexing'));

onMounted(async () => {
    await load();
    timer = setInterval(() => {
        if (indexing.value) {
            load();
        }
    }, 5000);
});
onUnmounted(() => clearInterval(timer));

const counts = computed(() => {
    const rows = entries.value ?? [];

    return {
        published: rows.filter((row) => row.published).length,
        total: rows.length,
    };
});

const editor = ref(false);
const editingId = ref(null);
const form = reactive({ title: '', content: '', sort_order: 0, publish: true });
const errors = ref({});
const saving = ref(false);

function openEditor(row = null) {
    editingId.value = row?.id ?? null;
    Object.assign(form, {
        title: row?.title ?? '',
        content: row?.content ?? '',
        sort_order: row?.sort_order ?? ((entries.value ?? []).reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0) + 1),
        publish: true,
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

const busyId = ref(null);

async function run(row, action) {
    busyId.value = row.id;

    try {
        await api.post(`/ai-chat/instructions/${row.id}/${action}`);
        await load();
    } finally {
        busyId.value = null;
    }
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
        <FullWidthBox title="Knowledge for the assistant" :collapsible="false">
            <template #actions>
                <RouterLink to="/ai-chat/bot-instructions" class="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Bot instructions</RouterLink>
                <Button size="sm" variant="primary" @click="openEditor()">New entry</Button>
            </template>

            <p class="mb-4 text-sm text-gray-500">
                Paste policies, FAQs, prices or procedures. When you publish an entry it is uploaded to the assistant's knowledge
                and becomes searchable after indexing (usually under a minute). The assistant keeps using the last published version
                until the new one is ready.
            </p>

            <Loader v-if="entries === null" />

            <div v-else-if="entries.length === 0" class="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
                <p class="text-sm text-gray-500">No knowledge yet. Until you publish an entry, the assistant tells agents it cannot find the answer.</p>
                <Button class="mt-4" variant="primary" @click="openEditor()">Add the first entry</Button>
            </div>

            <template v-else>
                <p class="mb-2 text-xs text-gray-400">{{ counts.published }} of {{ counts.total }} live in the assistant</p>

                <div class="space-y-3">
                    <article v-for="row in entries" :key="row.id" class="rounded-lg border border-gray-200 bg-white p-4">
                        <header class="flex flex-wrap items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
                                    <span class="text-xs font-normal text-gray-400">#{{ row.sort_order }}</span>
                                    {{ row.title }}
                                    <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="STATUS[row.status].cls">{{ STATUS[row.status].label }}</span>
                                </h3>
                                <p class="mt-0.5 text-xs text-gray-400">
                                    <template v-if="row.published">
                                        Live version published {{ row.published.published_at }}<span v-if="row.has_unpublished_changes"> · the draft below has unpublished changes</span>
                                    </template>
                                    <template v-else>Not live yet</template>
                                    · edited {{ row.updated_at }}<span v-if="row.updated_by"> by {{ row.updated_by }}</span>
                                </p>
                            </div>
                            <div class="flex shrink-0 gap-2">
                                <Button v-if="row.can_retry" size="sm" variant="primary" :disabled="busyId === row.id" @click="run(row, 'retry')">Retry</Button>
                                <Button v-else-if="row.status === 'draft'" size="sm" variant="primary" :disabled="busyId === row.id" @click="run(row, 'publish')">Publish</Button>
                                <Button size="sm" @click="openEditor(row)">Edit</Button>
                                <Button size="sm" variant="danger" @click="deleting = row">Delete</Button>
                            </div>
                        </header>
                        <p v-if="row.status === 'failed'" class="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                            Publishing failed: {{ row.error }}
                            <span v-if="row.published" class="mt-1 block">The previous published version is still used by the assistant.</span>
                        </p>
                        <p class="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-gray-700">{{ row.content }}</p>
                    </article>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="editor"
            :title="editingId ? 'Edit entry' : 'New knowledge entry'"
            :confirm-label="form.publish ? 'Save and publish' : 'Save draft'"
            size="lg"
            :processing="saving"
            :confirm-disabled="! form.title.trim() || ! form.content.trim()"
            @confirm="save"
            @cancel="editor = false"
        >
            <div class="mt-4 space-y-4">
                <InputText v-model="form.title" label="Title" :error="errors.title" />
                <Textarea v-model="form.content" label="Content (policies, FAQs, prices, procedures)" :rows="14" :error="errors.content" />
                <div class="flex flex-wrap items-end gap-6">
                    <div class="w-32">
                        <InputText v-model="form.sort_order" type="number" label="Order" :error="errors.sort_order" />
                    </div>
                    <NiceCheckbox v-model="form.publish" label="Publish after saving" />
                </div>
            </div>
        </ConfirmDialog>

        <ConfirmDialog
            :show="deleting !== null"
            title="Delete this entry?"
            :message="deleting ? `“${deleting.title}” will be removed from the assistant's knowledge.` : ''"
            confirm-label="Delete"
            confirm-variant="danger"
            :processing="deleteBusy"
            @confirm="confirmDelete"
            @cancel="deleting = null"
        />
    </AppLayout>
</template>
