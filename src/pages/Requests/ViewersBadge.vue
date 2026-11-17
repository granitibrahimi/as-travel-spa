<script setup>
// "Working" icon on a request card: someone else has the request open now.
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({ viewers: { type: Array, default: () => [] } });

const auth = useAuthStore();
const others = computed(() => props.viewers.filter((v) => v.id !== auth.user?.id));
const firstName = (name) => String(name ?? '').split(' ')[0];
const label = computed(() => {
    const names = others.value.map((v) => firstName(v.name));
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
});
const title = computed(() => `${others.value.map((v) => v.name).join(', ')} ${others.value.length === 1 ? 'has' : 'have'} this request open`);
</script>

<template>
    <span v-if="others.length" class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700" :title="title">
        <svg class="h-3.5 w-3.5 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        <span class="truncate">{{ label }} working</span>
    </span>
</template>
