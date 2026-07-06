<script setup>
/**
 * Branded loading indicator: the AS Travel wordmark with a plane flying
 * beneath it. Drop it anywhere data is being fetched.
 */
defineProps({
    message: { type: String, default: '' },
});
</script>

<template>
    <div class="flex min-h-[120px] flex-col items-center justify-center gap-2 py-10">
        <span class="select-none text-center text-lg font-bold leading-tight">
            <span class="text-red-600">AS</span> <span class="text-gray-700">Travel</span>
        </span>

        <div class="relative h-7 w-40 overflow-hidden">
            <svg
                class="loader-plane absolute top-1/2 h-7 w-7 -translate-y-1/2 text-red-500"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
            </svg>
        </div>

        <p v-if="message" class="text-xs text-gray-400">{{ message }}</p>
    </div>
</template>

<style scoped>
.loader-plane {
    animation: loader-fly 1.6s ease-in-out infinite;
}

@keyframes loader-fly {
    0% {
        left: -20%;
        opacity: 0;
    }

    15% {
        opacity: 1;
    }

    85% {
        opacity: 1;
    }

    100% {
        left: 100%;
        opacity: 0;
    }
}
</style>
