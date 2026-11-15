<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import api from '../../helpers/api';
import { downloadFile } from '../../helpers/download';

// Media attached to one WhatsApp message (image, sticker, voice note, video,
// document). The file sits behind the bearer-authenticated API, so it can't be
// a plain <img src>: fetch it as a blob and point the element at an object URL.
const props = defineProps({
    conversationId: { type: Number, required: true },
    message: { type: Object, required: true },
});

const objectUrl = ref(null);
const failed = ref(false);

const type = props.message.type;
const media = props.message.media ?? {};
const url = `/whatsapp/conversations/${props.conversationId}/messages/${props.message.id}/media`;
const previewable = ['image', 'sticker', 'audio', 'video'].includes(type);

onMounted(async () => {
    if (!previewable || !media.available) {
        return;
    }

    try {
        const { data } = await api.get(url, { responseType: 'blob' });
        objectUrl.value = URL.createObjectURL(data);
    } catch {
        failed.value = true;
    }
});

onUnmounted(() => {
    if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value);
    }
});

function download() {
    downloadFile(url, { fallbackName: media.filename ?? `whatsapp-${props.message.id}` });
}
</script>

<template>
    <div class="mb-1">
        <p v-if="!media.available || failed" class="italic opacity-70">
            {{ type === 'audio' ? (media.voice ? 'Voice note' : 'Audio') : type }} (file not available)
        </p>

        <template v-else-if="previewable">
            <div v-if="!objectUrl" class="h-24 w-40 animate-pulse rounded bg-black/10" />
            <a v-else-if="type === 'image'" :href="objectUrl" target="_blank" rel="noopener">
                <img :src="objectUrl" alt="" class="max-h-72 rounded">
            </a>
            <img v-else-if="type === 'sticker'" :src="objectUrl" alt="" class="h-32 w-32 object-contain">
            <audio v-else-if="type === 'audio'" :src="objectUrl" controls class="max-w-full" />
            <video v-else-if="type === 'video'" :src="objectUrl" controls class="max-h-72 max-w-full rounded" />
        </template>

        <button
            v-else
            type="button"
            class="flex items-center gap-2 rounded border border-current/20 bg-black/5 px-2 py-1 text-left hover:bg-black/10"
            @click="download"
        >
            <span aria-hidden="true">📄</span>
            <span class="truncate">{{ media.filename ?? 'Document' }}</span>
        </button>
    </div>
</template>
