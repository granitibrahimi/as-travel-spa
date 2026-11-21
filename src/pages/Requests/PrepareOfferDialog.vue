<script setup>
import { computed, ref, watch } from 'vue';
import api from '../../helpers/api';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Textarea from '../../components/Form/Textarea.vue';
import Button from '../../components/Button.vue';

/**
 * "Prepare offer": the agent pastes the raw offer (from a supplier, a booking
 * site or notes), AI formats it, the agent checks / edits it and saves it as
 * the request's next offer. Nothing is saved until "Save offer".
 */
const props = defineProps({
    show: { type: Boolean, default: false },
    task: { type: Object, default: null },
});

const emit = defineEmits(['saved', 'cancel']);

const rawText = ref('');
const offerText = ref('');
// 'paste' (raw text) or 'review' (formatted text, editable)
const step = ref('paste');
const error = ref('');
const processing = ref(false);

watch(() => props.show, (open) => {
    if (open) {
        rawText.value = '';
        offerText.value = '';
        step.value = 'paste';
        error.value = '';
    }
});

const number = computed(() => (props.task?.offers_count ?? props.task?.offers?.length ?? 0) + 1);
const ready = computed(() => (step.value === 'paste' ? rawText.value : offerText.value).trim().length > 0);

function errorMessage(e, fallback) {
    const status = e.response?.status;
    if (status !== 422 && status !== 403 && status !== 503) {
        throw e;
    }

    return Object.values(e.response?.data?.errors ?? {})[0]?.[0] ?? e.response?.data?.message ?? fallback;
}

async function format() {
    processing.value = true;
    error.value = '';

    try {
        const { data } = await api.post(`/simple-tasks/${props.task.id}/offers/prepare`, { raw_text: rawText.value.trim() });
        offerText.value = data.data.offer_text;
        step.value = 'review';
    } catch (e) {
        error.value = errorMessage(e, 'Could not format the offer.');
    } finally {
        processing.value = false;
    }
}

async function save() {
    processing.value = true;
    error.value = '';

    try {
        await api.post(`/simple-tasks/${props.task.id}/offers`, { offer_text: offerText.value.trim() });
        emit('saved');
    } catch (e) {
        error.value = errorMessage(e, 'Could not save the offer.');
    } finally {
        processing.value = false;
    }
}

function confirm() {
    if (! ready.value || processing.value) {
        return;
    }

    return step.value === 'paste' ? format() : save();
}

// Copy as is: WhatsApp reads *bold* and _italic_ itself.
const copied = ref(false);
let copiedTimer = null;

async function copy() {
    try {
        await navigator.clipboard.writeText(offerText.value.trim());
        copied.value = true;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => (copied.value = false), 2000);
    } catch {
        error.value = 'Could not copy. Select the text and copy it by hand.';
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// How WhatsApp will show it: *bold*, _italic_, ~strike~.
const preview = computed(() => escapeHtml(offerText.value.trim())
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/gm, '$1<strong>$2</strong>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/gm, '$1<em>$2</em>')
    .replace(/(^|[\s(])~([^~\n]+)~(?=$|[\s).,!?:;])/gm, '$1<del>$2</del>'));

function backToRaw() {
    step.value = 'paste';
    error.value = '';
}
</script>

<template>
    <ConfirmDialog
        :show="show"
        :size="step === 'review' ? 'xl' : 'lg'"
        :title="task ? `Prepare offer ${number} for #${task.id}` : 'Prepare offer'"
        :message="step === 'paste'
            ? 'Paste the offer as you have it (from the supplier, a booking site or your notes). AI will turn it into a clean offer for the customer.'
            : 'Check the offer and edit it if needed. Prices, dates and hotels must match the original. Saving adds it as the next offer; the request stays open.'"
        :confirm-label="step === 'paste' ? 'Format with AI' : 'Save offer'"
        :processing="processing"
        :confirm-disabled="! ready"
        @confirm="confirm"
        @cancel="emit('cancel')"
    >
        <div v-if="step === 'paste'" class="mt-4">
            <Textarea v-model="rawText" label="Raw offer text *" :rows="10" placeholder="Paste the offer text here…" />
            <p v-if="processing" class="mt-2 text-xs text-gray-500">Formatting with AI, this can take a few seconds…</p>
        </div>
        <div v-else class="mt-4 space-y-3">
            <!-- Text on the left, how WhatsApp shows it on the right -->
            <div class="grid gap-4 md:grid-cols-2">
                <div class="min-w-0 space-y-3">
                    <Textarea v-model="offerText" label="Offer for the customer *" :rows="16" />
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap gap-4 text-xs">
                            <button type="button" class="text-blue-600 hover:underline" :disabled="processing" @click="backToRaw">← Edit the raw text</button>
                            <button type="button" class="text-blue-600 hover:underline" :disabled="processing" @click="format">Format again</button>
                        </div>
                        <Button size="sm" :disabled="! ready" @click="copy">{{ copied ? '✓ Copied' : 'Copy for WhatsApp' }}</Button>
                    </div>
                </div>
                <div class="flex min-w-0 flex-col">
                    <p class="mb-1 text-sm font-medium text-gray-700">WhatsApp preview</p>
                    <div class="min-h-[24rem] flex-1 rounded-lg bg-[#e5ddd5] p-3">
                        <!-- eslint-disable-next-line vue/no-v-html -- escaped above, only b/i/del added -->
                        <div class="ml-auto max-w-md whitespace-pre-line break-words rounded-lg bg-[#d9fdd3] px-3 py-2 text-sm text-gray-900 shadow-sm" v-html="preview" />
                    </div>
                </div>
            </div>
            <details class="text-xs text-gray-500">
                <summary class="cursor-pointer">Original text</summary>
                <p class="mt-1 whitespace-pre-line rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">{{ rawText }}</p>
            </details>
        </div>
        <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </ConfirmDialog>
</template>
