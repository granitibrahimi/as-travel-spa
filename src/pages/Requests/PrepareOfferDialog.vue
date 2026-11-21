<script setup>
import { computed, ref, watch } from 'vue';
import api from '../../helpers/api';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Textarea from '../../components/Form/Textarea.vue';

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

function backToRaw() {
    step.value = 'paste';
    error.value = '';
}
</script>

<template>
    <ConfirmDialog
        :show="show"
        size="lg"
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
        <div v-else class="mt-4 space-y-2">
            <Textarea v-model="offerText" label="Offer for the customer *" :rows="12" />
            <div class="flex flex-wrap gap-4 text-xs">
                <button type="button" class="text-blue-600 hover:underline" :disabled="processing" @click="backToRaw">← Edit the raw text</button>
                <button type="button" class="text-blue-600 hover:underline" :disabled="processing" @click="format">Format again</button>
            </div>
            <details class="text-xs text-gray-500">
                <summary class="cursor-pointer">Original text</summary>
                <p class="mt-1 whitespace-pre-line rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">{{ rawText }}</p>
            </details>
        </div>
        <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </ConfirmDialog>
</template>
