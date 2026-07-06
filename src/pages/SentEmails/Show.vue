<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const email = ref(null);
const title = computed(() => email.value?.subject ?? `Sent Email #${id}`);

onMounted(async () => {
    const { data } = await api.get(`/sent-emails/${id}`);
    email.value = data.data ?? data;
});

const badgeClass = {
    sent: 'bg-gray-100 text-gray-600',
    opened: 'bg-green-100 text-green-700',
    bounced: 'bg-red-100 text-red-700',
};
const statusLabel = { sent: 'Sent', opened: 'Opened', bounced: 'Bounced' };
</script>

<template>
    <AppLayout :title="`Sent Email #${id}`" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="! email" />
            <template v-else>
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Type</dt>
                        <dd class="text-gray-800">{{ email.type }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Status</dt>
                        <dd>
                            <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="badgeClass[email.status]">
                                {{ statusLabel[email.status] }}
                            </span>
                            <span v-if="email.status === 'opened'" class="ml-1 text-gray-500">({{ email.open_count }})</span>
                            <span v-if="email.bounce_reason" class="ml-1 text-gray-400">— {{ email.bounce_reason }}</span>
                        </dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">To</dt>
                        <dd class="break-all text-gray-800">{{ email.to }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">From</dt>
                        <dd class="break-all text-gray-800">{{ email.from ?? '-' }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Sent at</dt>
                        <dd class="text-gray-800">{{ email.sent_at }}</dd>
                    </div>
                    <div v-if="email.opened_at" class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">First opened</dt>
                        <dd class="text-gray-800">{{ email.opened_at }}</dd>
                    </div>
                    <div v-if="email.last_seen_at" class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Last seen</dt>
                        <dd class="text-gray-800">{{ email.last_seen_at }}</dd>
                    </div>
                </dl>

                <div class="mt-6">
                    <iframe
                        v-if="email.body"
                        :srcdoc="email.body"
                        sandbox
                        class="min-h-[70vh] w-full rounded border border-gray-200 bg-white"
                    />
                    <div v-else class="rounded border border-gray-200 bg-gray-50 px-4 py-6 text-gray-500">
                        No HTML body was stored for this email.
                    </div>
                </div>
            </template>

            <template #footer>
                <RouterLink to="/sent-emails" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to list
                </RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
