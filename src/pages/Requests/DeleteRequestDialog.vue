<script setup>
import { ref, watch } from 'vue';
import api from '../../helpers/api';
import ConfirmDialog from '../../components/ConfirmDialog.vue';

// Confirms and deletes a request for good (permission simpleTasks.delete).
// Emits `deleted` with the id once it is gone, `close` when cancelled.
const props = defineProps({
    task: { type: Object, default: null },
});

const emit = defineEmits(['close', 'deleted']);

const processing = ref(false);
const error = ref('');

watch(() => props.task, () => { error.value = ''; });

async function confirm() {
    processing.value = true;
    error.value = '';

    try {
        await api.delete(`/simple-tasks/${props.task.id}`);
        emit('deleted', props.task.id);
    } catch (e) {
        error.value = e.response?.data?.message || 'The request could not be deleted.';
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <ConfirmDialog
        :show="Boolean(task)"
        :title="task ? `Delete request #${task.id}?` : ''"
        confirm-label="Delete for good"
        confirm-variant="primary"
        :processing="processing"
        @confirm="confirm"
        @cancel="emit('close')"
    >
        <p class="text-sm text-gray-700">
            This removes the request from <span class="font-medium">{{ task?.customer_name }}</span> completely: its history, offers,
            destinations and the agents' notifications about it. Nothing is kept and it cannot be undone.
        </p>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </ConfirmDialog>
</template>
