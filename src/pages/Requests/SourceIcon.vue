<script setup>
// A request's source as a coloured icon (ids from the API's SimpleTaskSource).
// `badge` draws the coloured icon in a box with a border of the same colour
// (board cards, list), otherwise the coloured icon on its own (request page).
import { computed } from 'vue';

const props = defineProps({
    source: { type: [Object, Number], required: true },
    badge: { type: Boolean, default: false },
});

const SOURCES = {
    1: { name: 'Phone', color: '#2563eb' },
    2: { name: 'WhatsApp', color: '#25d366' },
    3: { name: 'Email', color: '#d97706' },
    4: { name: 'In office', color: '#4f46e5' },
    5: { name: 'Website', color: '#0d9488' },
    6: { name: 'Instagram', color: '#e1306c' },
    7: { name: 'Facebook', color: '#1877f2' },
    8: { name: 'Viber', color: '#7360f2' },
    99: { name: 'Other', color: '#6b7280' },
};

const id = computed(() => props.source?.id ?? props.source);
const info = computed(() => SOURCES[id.value] ?? SOURCES[99]);
const label = computed(() => props.source?.name ?? info.value.name);
</script>

<template>
    <span
        class="inline-flex shrink-0 items-center justify-center"
        :class="badge ? 'h-6 w-6 rounded-md border bg-white' : 'h-4 w-4'"
        :style="badge ? { color: info.color, borderColor: info.color } : { color: info.color }"
        :title="label"
        role="img"
        :aria-label="label"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <!-- Phone -->
            <path v-if="id === 1" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            <!-- WhatsApp: chat bubble with a handset -->
            <template v-else-if="id === 2">
                <path d="M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.6z" />
                <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z" fill="currentColor" stroke="none" />
            </template>
            <!-- Email -->
            <template v-else-if="id === 3">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
            </template>
            <!-- In office: building -->
            <template v-else-if="id === 4">
                <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
                <path d="M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4" />
            </template>
            <!-- Website: globe -->
            <template v-else-if="id === 5">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </template>
            <!-- Instagram -->
            <template v-else-if="id === 6">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </template>
            <!-- Facebook -->
            <path v-else-if="id === 7" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z" fill="currentColor" stroke="none" />
            <!-- Viber: rounded speech bubble with a handset -->
            <template v-else-if="id === 8">
                <path d="M12 2.5c-5 0-8.5 2.3-8.5 7.5 0 3 1.2 5.2 3.5 6.4V21l3.4-3.3c.5.1 1 .1 1.6.1 5 0 8.5-2.3 8.5-7.8S17 2.5 12 2.5z" />
                <path d="M9.3 7.5c0 2.7 2.2 5 5 5l.9-1.2-1.8-.9-.8.6a3.6 3.6 0 0 1-1.8-1.8l.6-.8-.9-1.8z" fill="currentColor" stroke="none" />
            </template>
            <!-- Other -->
            <template v-else>
                <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" />
            </template>
        </svg>
    </span>
</template>
