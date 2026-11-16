<script setup>
import { computed, ref, watch } from 'vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Textarea from '../../components/Form/Textarea.vue';

/**
 * Marking a request "Offer sent" asks the agent to paste the offer they sent
 * to the customer; the button stays disabled until it is filled in.
 */
const props = defineProps({
    show: { type: Boolean, default: false },
    task: { type: Object, default: null },
    processing: { type: Boolean, default: false },
    error: { type: String, default: '' },
    // Text already typed in the request page's comment box, carried over.
    initialComment: { type: String, default: '' },
});

const emit = defineEmits(['confirm', 'cancel']);

const offerText = ref('');
const comment = ref('');

watch(() => props.show, (open) => {
    if (open) {
        offerText.value = '';
        comment.value = props.initialComment;
    }
});

const ready = computed(() => offerText.value.trim().length > 0);

function confirm() {
    if (ready.value) {
        emit('confirm', { offerText: offerText.value.trim(), comment: comment.value.trim() || null });
    }
}
</script>

<template>
    <ConfirmDialog
        :show="show"
        size="lg"
        :title="task ? `Offer sent for #${task.id}` : 'Offer sent'"
        :message="task ? `${task.customer_name}: paste the offer exactly as you sent it to the customer. This finishes the request and notifies the responsible agents.` : ''"
        confirm-label="Mark as offer sent"
        :processing="processing"
        :confirm-disabled="! ready"
        @confirm="confirm"
        @cancel="emit('cancel')"
    >
        <div class="mt-4 space-y-3">
            <Textarea v-model="offerText" label="Offer sent to the customer *" :rows="10" placeholder="Paste the offer text here…" />
            <Textarea v-model="comment" label="Comment (optional)" :rows="2" maxlength="200" />
        </div>
        <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </ConfirmDialog>
</template>
