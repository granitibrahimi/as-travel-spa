<script setup>
import { computed, ref, watch } from 'vue';
import api from '../../helpers/api';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Textarea from '../../components/Form/Textarea.vue';

/**
 * Record an offer sent to the customer: the agent pastes it as sent. A
 * request can get several offers; adding one doesn't close it.
 */
const props = defineProps({
    show: { type: Boolean, default: false },
    task: { type: Object, default: null },
});

const emit = defineEmits(['saved', 'cancel']);

const offerText = ref('');
const error = ref('');
const processing = ref(false);

watch(() => props.show, (open) => {
    if (open) {
        offerText.value = '';
        error.value = '';
    }
});

const ready = computed(() => offerText.value.trim().length > 0);
const number = computed(() => (props.task?.offers_count ?? props.task?.offers?.length ?? 0) + 1);

async function save() {
    if (! ready.value || processing.value) {
        return;
    }

    processing.value = true;
    error.value = '';

    try {
        await api.post(`/simple-tasks/${props.task.id}/offers`, { offer_text: offerText.value.trim() });
        emit('saved');
    } catch (e) {
        if (e.response?.status !== 422 && e.response?.status !== 403) {
            throw e;
        }
        error.value = Object.values(e.response?.data?.errors ?? {})[0]?.[0] ?? e.response?.data?.message ?? 'Could not save the offer.';
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <ConfirmDialog
        :show="show"
        size="lg"
        :title="task ? `Offer ${number} for #${task.id}` : 'Add offer'"
        :message="task ? `${task.customer_name}: paste the offer exactly as you sent it. The request stays open, so you can send more offers and close it when you are done.` : ''"
        confirm-label="Save offer"
        :processing="processing"
        :confirm-disabled="! ready"
        @confirm="save"
        @cancel="emit('cancel')"
    >
        <div class="mt-4">
            <Textarea v-model="offerText" label="Offer sent to the customer *" :rows="10" placeholder="Paste the offer text here…" />
        </div>
        <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </ConfirmDialog>
</template>
