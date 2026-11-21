<script setup>
import { onMounted, ref } from 'vue';
import api from '../../helpers/api';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Button from '../../components/Button.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

// The rules the AI follows for "Prepare offer" on a request: it turns the
// pasted raw offer into a WhatsApp-ready text. Sent as `instructions` with
// each OpenAI request.
const settings = ref(null);
const text = ref('');
const saving = ref(false);
const saved = ref(false);
const error = ref('');

async function load() {
    const { data } = await api.get('/ai-chat/offer-instructions');
    settings.value = castResource(data);
    text.value = settings.value.instructions;
}

onMounted(load);

async function save(instructions) {
    saving.value = true;
    saved.value = false;
    error.value = '';

    try {
        await api.put('/ai-chat/offer-instructions', { instructions });
        await load();
        saved.value = true;
    } catch (e) {
        if (e.response?.status !== 422) {
            throw e;
        }
        error.value = Object.values(e.response.data?.errors ?? {})[0]?.[0] ?? 'Could not save.';
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppLayout title="Offer Instructions">
        <FullWidthBox title="Offer instructions" :collapsible="false">
            <Loader v-if="settings === null" />
            <template v-else>
                <p class="mb-3 text-sm text-gray-500">
                    How the AI formats an offer when an agent uses <span class="font-medium">Prepare offer</span> on a request: language, layout, emojis and WhatsApp formatting
                    (<code>*bold*</code>, <code>_italic_</code>). Changes apply to the next offer prepared.
                    <span v-if="settings.is_default" class="font-medium text-amber-700">This is the default text; save to make it yours.</span>
                </p>
                <textarea
                    v-model="text"
                    rows="22"
                    class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    @input="saved = false"
                />
                <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-gray-400">
                        <template v-if="settings.updated_at">Saved {{ settings.updated_at }}</template>
                    </p>
                    <div class="flex items-center gap-3">
                        <span v-if="saved" class="text-sm text-green-700">Saved</span>
                        <Button v-if="! settings.is_default" :disabled="saving" @click="save(null)">Reset to default</Button>
                        <Button variant="primary" :disabled="saving || ! text.trim()" @click="save(text)">{{ saving ? 'Saving…' : 'Save' }}</Button>
                    </div>
                </div>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
