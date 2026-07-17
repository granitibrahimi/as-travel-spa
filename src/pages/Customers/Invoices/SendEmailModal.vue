<script setup>
import { computed, ref, watch } from 'vue';
import api from '../../../helpers/api';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';

// Compose + send an invoice email. Posts to the api send-email endpoint, which
// queues the mail with the generated PDF attached.
const props = defineProps({
    invoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'sent']);

const typeOptions = [
    { value: 1, label: 'Invoice' },
    { value: 2, label: 'Invoice with products' },
];

// The detail payload nests the customer as { id, name }; the list row sends the
// name as a plain string.
const customerName = computed(() => {
    const customer = props.invoice?.customer;
    return (typeof customer === 'object' ? customer?.name : customer) ?? '';
});

// Default message body — {customerName} is substituted when the modal opens.
function defaultBody() {
    return `Përshëndetje ${customerName.value}

Te bashkangjitur gjeni faturën tuaj.

Ju lutem na informoni rreth statusit të pagesës së kësaj fature.

Per çdo mospërputhje të faturës na njoftoni brenda 24 orëve.

Faleminderit!
AS Travel`;
}

const form = ref({ to: '', subject: '', body: '', type: 1 });
const sending = ref(false);
const error = ref('');
const showPreview = ref(false);

// Reset + prefill each time the modal opens for a new invoice.
watch(() => props.show, (open) => {
    if (open) {
        error.value = '';
        showPreview.value = false;
        form.value = {
            to: '',
            subject: props.invoice ? `Invoice ${props.invoice.gen_id}` : '',
            body: defaultBody(),
            type: 1,
        };
    }
});

async function send() {
    if (sending.value || !props.invoice) {
        return;
    }

    sending.value = true;
    error.value = '';

    try {
        await api.post(`/customer-invoices/${props.invoice.id}/send-email`, form.value);
        emit('sent');
        emit('close');
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not send the email.';
    } finally {
        sending.value = false;
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
                class="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
                :class="{ 'pointer-events-none opacity-75': sending }"
            >
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">
                        Send invoice email<span v-if="invoice"> · {{ invoice.gen_id }}</span>
                    </h3>
                    <button type="button" class="text-sm text-red-700 hover:underline" @click="showPreview = !showPreview">
                        {{ showPreview ? 'Edit' : 'Preview' }}
                    </button>
                </div>

                <!-- Edit form -->
                <div v-if="!showPreview" class="mt-4 space-y-3">
                    <InputText v-model="form.to" label="To" type="email" placeholder="client@example.com" />
                    <InputText v-model="form.subject" label="Subject" />
                    <Select v-model="form.type" label="Attachment" :options="typeOptions" :placeholder="null" />
                    <Textarea v-model="form.body" label="Message" :rows="8" />
                    <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
                </div>

                <!-- Preview -->
                <div v-else class="mt-4 rounded border border-gray-200">
                    <dl class="divide-y divide-gray-100 border-b border-gray-100 text-sm">
                        <div class="flex gap-2 px-3 py-2"><dt class="w-20 shrink-0 text-gray-400">To</dt><dd class="break-all text-gray-700">{{ form.to || '—' }}</dd></div>
                        <div class="flex gap-2 px-3 py-2"><dt class="w-20 shrink-0 text-gray-400">Subject</dt><dd class="text-gray-700">{{ form.subject || '—' }}</dd></div>
                        <div class="flex gap-2 px-3 py-2"><dt class="w-20 shrink-0 text-gray-400">Attachment</dt><dd class="text-gray-700">{{ typeOptions.find((o) => o.value === form.type)?.label }} (PDF)</dd></div>
                    </dl>
                    <p class="whitespace-pre-wrap px-3 py-3 text-sm text-gray-800">{{ form.body }}</p>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <Button :disabled="sending" @click="emit('close')">Cancel</Button>
                    <Button variant="primary" :loading="sending" @click="send">Send email</Button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
