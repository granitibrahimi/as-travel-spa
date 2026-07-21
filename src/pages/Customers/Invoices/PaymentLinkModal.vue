<script setup>
import { ref, watch } from 'vue';
import api from '../../../helpers/api';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';

// Generate an online payment link for an invoice: confirm the amount (defaults
// to the outstanding debt), then show the generated URL to copy.
const props = defineProps({
    invoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const amount = ref('');
const link = ref('');
const copied = ref(false);
const generating = ref(false);
const error = ref('');

watch(() => props.show, (open) => {
    if (open) {
        error.value = '';
        link.value = '';
        copied.value = false;
        // Detail payload exposes `debt`; the list row may not — leave blank then.
        amount.value = props.invoice?.debt ?? '';
    }
});

async function generate() {
    if (generating.value || !props.invoice) {
        return;
    }

    generating.value = true;
    error.value = '';

    try {
        const { data } = await api.post(`/customers/invoices/${props.invoice.id}/payment-link`, {
            amount: amount.value || undefined,
        });
        link.value = data.url ?? '';

        if (!link.value) {
            error.value = 'Link generated, but no public URL is configured.';
        }
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not generate the payment link.';
    } finally {
        generating.value = false;
    }
}

async function copy() {
    try {
        await navigator.clipboard.writeText(link.value);
        copied.value = true;
    } catch {
        copied.value = false;
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
                :class="{ 'pointer-events-none opacity-75': generating }"
            >
                <h3 class="text-lg font-semibold text-gray-900">
                    Payment link<span v-if="invoice"> · {{ invoice.gen_id }}</span>
                </h3>

                <div v-if="!link" class="mt-4 space-y-3">
                    <InputText v-model="amount" label="Amount" type="number" placeholder="Outstanding amount" />
                    <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
                    <div class="flex justify-end gap-3 pt-2">
                        <Button :disabled="generating" @click="emit('close')">Cancel</Button>
                        <Button variant="primary" :loading="generating" @click="generate">Generate link</Button>
                    </div>
                </div>

                <div v-else class="mt-4 space-y-3">
                    <p class="text-sm text-gray-600">Share this link with the customer to pay online:</p>
                    <div class="flex items-center gap-2">
                        <input :value="link" readonly class="w-full rounded border border-gray-300 px-2 py-1 text-sm" @focus="$event.target.select()">
                        <Button variant="secondary" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</Button>
                    </div>
                    <p v-if="error" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">{{ error }}</p>
                    <div class="flex justify-end pt-2">
                        <Button variant="primary" @click="emit('close')">Done</Button>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
