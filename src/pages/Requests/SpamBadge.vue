<script setup>
// The Spam flag on a request: an orange badge with a "no entry" icon.
import SpamIcon from './SpamIcon.vue';

defineProps({ size: { type: String, default: 'sm' } }); // sm (cards, list) | md (request page)
</script>

<template>
    <span
        class="inline-flex items-center gap-1 rounded bg-orange-500 font-semibold uppercase text-white"
        :class="size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'"
        title="Flagged as spam"
    >
        <SpamIcon :class="size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'" />
        Spam
    </span>
</template>
