<script setup>
import { ref } from 'vue';
import Button from '../Button.vue';

/**
 * Two-factor setup: the QR code to scan with an authenticator app (Google
 * Authenticator, Microsoft Authenticator, 1Password, ...), the key for typing it
 * in by hand, and the 6-digit code that confirms it. Emits `submit` with the code;
 * the parent posts it (user page or sign-in).
 */
defineProps({
    qrCode: { type: String, required: true },
    secret: { type: String, default: '' },
    processing: { type: Boolean, default: false },
    error: { type: String, default: '' },
    submitLabel: { type: String, default: 'Confirm' },
});

const emit = defineEmits(['submit']);

const code = ref('');

function onInput(event) {
    code.value = event.target.value.replace(/\D/g, '').slice(0, 6);
    event.target.value = code.value;
}

function submit() {
    if (code.value.length === 6) {
        emit('submit', code.value);
    }
}
</script>

<template>
    <form class="space-y-3" @submit.prevent="submit">
        <ol class="list-decimal space-y-1 pl-5 text-sm text-gray-600">
            <li>Open an authenticator app on the phone (Google or Microsoft Authenticator, 1Password, ...).</li>
            <li>Scan this QR code.</li>
            <li>Enter the 6-digit code the app shows.</li>
        </ol>

        <div class="flex justify-center">
            <img :src="qrCode" alt="Two-factor QR code" class="h-48 w-48 rounded border border-gray-200 bg-white p-2">
        </div>

        <p v-if="secret" class="text-center text-xs text-gray-500">
            Can't scan? Enter this key: <span class="select-all font-mono text-gray-800">{{ secret }}</span>
        </p>

        <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Code from the app</label>
            <input
                :value="code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="123456"
                class="w-full rounded border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-[0.4em] focus:border-red-500 focus:ring-1 focus:ring-red-500"
                @input="onInput"
            >
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <Button type="submit" variant="primary" class="w-full" :loading="processing" :disabled="code.length !== 6">
            {{ submitLabel }}
        </Button>
    </form>
</template>
