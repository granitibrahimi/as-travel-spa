<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { formatPhone } from '../../helpers/phone.js';
import { routeUrl } from '../../helpers/route.js';
import Button from '../Button.vue';
import Select from '../Form/Select.vue';
import SourceIcon from '../../pages/Requests/SourceIcon.vue';

// One suggested link (request -> traveler, traveler -> customer) with its
// evidence and Accept / Reject. `context` hides the side the page already shows:
// 'queue' shows both, 'request' only the traveler, 'person' only the other record.
const props = defineProps({
    suggestion: { type: Object, required: true },
    relationTypes: { type: Array, default: () => [] },
    context: { type: String, default: 'queue' },
});

const emit = defineEmits(['decided']);

const isRequest = computed(() => props.suggestion.kind.id === 1);
const pending = computed(() => props.suggestion.status.id === 0);
const strong = computed(() => props.suggestion.strength === 'strong');
const relationType = ref(props.suggestion.relation_type?.id ?? null);
const busy = ref('');
const error = ref('');

watch(() => props.suggestion.relation_type, (type) => {
    relationType.value = type?.id ?? null;
});

const showRequest = computed(() => isRequest.value && props.context !== 'request');
const showPerson = computed(() => props.context !== 'person');
const showCustomer = computed(() => ! isRequest.value);
const twoSides = computed(() => (isRequest.value ? showRequest.value && showPerson.value : showPerson.value && showCustomer.value));

async function decide(action) {
    if (busy.value) {
        return;
    }
    if (action === 'accept' && ! isRequest.value && ! relationType.value) {
        error.value = 'Pick how the traveler is related to the customer.';
        return;
    }

    busy.value = action;
    error.value = '';
    try {
        await api.put(`/link-suggestions/${props.suggestion.id}/${action}`, isRequest.value ? {} : { relation_type: relationType.value });
        emit('decided', { id: props.suggestion.id, action });
    } catch (e) {
        if (e.response?.status !== 422) {
            throw e;
        }
        error.value = Object.values(e.response.data.errors ?? {})[0]?.[0] ?? e.response.data.message ?? 'Could not save.';
    } finally {
        busy.value = '';
    }
}
</script>

<template>
    <article class="rounded-lg border bg-white p-4 shadow-sm" :class="strong ? 'border-green-200' : 'border-amber-200'">
        <header class="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span
                class="rounded-full px-2.5 py-0.5 font-semibold"
                :class="strong ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
            >{{ strong ? 'Strong match' : 'Possible match' }} · {{ suggestion.score }}%</span>
            <span v-if="suggestion.method.id === 2" class="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 font-semibold text-violet-700">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 13z" /></svg>
                Checked by AI
            </span>
            <span class="text-gray-400">{{ suggestion.kind.name }}</span>
            <span class="ml-auto text-gray-400">{{ suggestion.created_at }}</span>
        </header>

        <div class="grid grid-cols-1 items-stretch gap-3" :class="twoSides ? 'md:grid-cols-[1fr_auto_1fr]' : ''">
            <!-- Request (subject of request -> traveler) -->
            <section v-if="showRequest && suggestion.request" class="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Request</p>
                <RouterLink :to="routeUrl('simpleTasks.show', suggestion.request.id)" class="mt-1 block font-medium text-red-600 hover:underline">
                    #{{ suggestion.request.id }} · {{ suggestion.request.customer_name }}
                </RouterLink>
                <p class="mt-1 flex flex-wrap items-center gap-1.5 text-gray-600">
                    <SourceIcon v-if="suggestion.request.source" :source="suggestion.request.source" />
                    <span>{{ suggestion.request.source?.name }}</span>
                    <template v-if="suggestion.request.customer_contact">
                        <span class="text-gray-300">·</span>
                        <span>{{ formatPhone(suggestion.request.customer_contact) }}</span>
                    </template>
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ suggestion.request.status?.name }} · {{ suggestion.request.created_at }}</p>
            </section>

            <!-- Traveler as subject (traveler -> customer) -->
            <section v-if="! isRequest && showPerson && suggestion.person" class="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Traveler</p>
                <RouterLink :to="routeUrl('persons.show', suggestion.person.id)" class="mt-1 block font-medium text-red-600 hover:underline">{{ suggestion.person.name }}</RouterLink>
                <p v-if="suggestion.person.dob || suggestion.person.email" class="mt-1 text-xs text-gray-500">
                    {{ [suggestion.person.dob, suggestion.person.email].filter(Boolean).join(' · ') }}
                </p>
                <ul v-if="suggestion.person.contacts.length" class="mt-1 space-y-0.5 text-xs text-gray-600">
                    <li v-for="contact in suggestion.person.contacts.slice(0, 4)" :key="contact.id">{{ contact.type }}: {{ formatPhone(contact.reference) }}</li>
                </ul>
            </section>

            <div v-if="twoSides" class="hidden items-center justify-center text-gray-300 md:flex" aria-hidden="true">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" /></svg>
            </div>

            <!-- Traveler as target (request -> traveler) -->
            <section v-if="isRequest && showPerson && suggestion.person" class="rounded border border-gray-200 p-3 text-sm">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Traveler</p>
                <RouterLink :to="routeUrl('persons.show', suggestion.person.id)" class="mt-1 block font-medium text-red-600 hover:underline">{{ suggestion.person.name }}</RouterLink>
                <p v-if="suggestion.person.dob || suggestion.person.email" class="mt-1 text-xs text-gray-500">
                    {{ [suggestion.person.dob, suggestion.person.email].filter(Boolean).join(' · ') }}
                </p>
                <ul v-if="suggestion.person.contacts.length" class="mt-1 space-y-0.5 text-xs">
                    <li v-for="contact in suggestion.person.contacts.slice(0, 4)" :key="contact.id" :class="contact.matched ? 'font-semibold text-green-700' : 'text-gray-600'">
                        {{ contact.type }}: {{ formatPhone(contact.reference) }}<span v-if="contact.matched"> ✓</span>
                    </li>
                </ul>
                <p v-if="suggestion.person.customers.length" class="mt-1 text-xs text-gray-500">
                    Customer: {{ suggestion.person.customers.map((c) => c.name + (c.relation ? ` (${c.relation})` : '')).join(', ') }}
                </p>
            </section>

            <!-- Customer (target of traveler -> customer) -->
            <section v-if="showCustomer && suggestion.customer" class="rounded border border-gray-200 p-3 text-sm">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Customer · {{ suggestion.customer.type }}</p>
                <RouterLink :to="routeUrl('customers.show', suggestion.customer.id)" class="mt-1 block font-medium text-red-600 hover:underline">{{ suggestion.customer.name }}</RouterLink>
                <p v-if="suggestion.customer.email || suggestion.customer.phone" class="mt-1 text-xs text-gray-500">
                    {{ [suggestion.customer.email, suggestion.customer.phone].filter(Boolean).join(' · ') }}
                </p>
            </section>
        </div>

        <ul class="mt-3 space-y-1 text-sm text-gray-700">
            <li v-for="reason in suggestion.reasons" :key="reason" class="flex gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd" /></svg>
                <span>{{ reason }}</span>
            </li>
        </ul>
        <p v-if="suggestion.ai_reason" class="mt-2 rounded bg-violet-50 px-3 py-2 text-sm italic text-violet-800">“{{ suggestion.ai_reason }}”</p>

        <footer class="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
            <template v-if="pending">
                <div v-if="! isRequest" class="w-48">
                    <Select v-model="relationType" label="Relation" :options="relationTypes" />
                </div>
                <Button variant="primary" :disabled="!! busy" @click="decide('accept')">{{ busy === 'accept' ? 'Linking…' : (isRequest ? 'Link request' : 'Connect') }}</Button>
                <Button :disabled="!! busy" @click="decide('reject')">{{ busy === 'reject' ? 'Saving…' : 'Not a match' }}</Button>
                <p v-if="error" class="w-full text-sm text-red-600">{{ error }}</p>
            </template>
            <p v-else class="text-sm text-gray-500">
                {{ suggestion.status.name }}<template v-if="suggestion.decided_by"> by {{ suggestion.decided_by }}</template><template v-if="suggestion.decided_at"> · {{ suggestion.decided_at }}</template>
                <template v-if="suggestion.relation_type && suggestion.status.id === 1"> · as {{ suggestion.relation_type.name }}</template>
            </p>
        </footer>
    </article>
</template>
