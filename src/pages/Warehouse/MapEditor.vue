<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import { useWarehouseStore } from '../../stores/warehouse.js';
import { key } from '../../helpers/warehouse.js';

const store = useWarehouseStore();

const CELL = 30;
const PAD = 8;

const tool = ref('shelf'); // 'shelf' | 'wall' | 'entrance' | 'erase'
const nextNumber = ref('A-01');
const painting = ref(false);
const showClear = ref(false);
const backupText = ref('');
const importError = ref('');
const importedOk = ref(false);

const cols = computed(() => store.map.cols);
const rows = computed(() => store.map.rows);
const width = computed(() => cols.value * CELL + PAD * 2);
const height = computed(() => rows.value * CELL + PAD * 2);

const resizeCols = ref(store.map.cols);
const resizeRows = ref(store.map.rows);

const cellLookup = computed(() => store.map.cells);

function cellClass(x, y) {
    const cell = cellLookup.value[key(x, y)];

    if (store.map.entrance && store.map.entrance.x === x && store.map.entrance.y === y) {
        return 'fill-green-600';
    }

    if (!cell) {
        return 'fill-white hover:fill-red-50';
    }

    return cell.type === 'shelf' ? 'fill-slate-300' : 'fill-gray-400';
}

function shelfNumberAt(x, y) {
    const cell = cellLookup.value[key(x, y)];
    return cell?.type === 'shelf' ? cell.number : '';
}

function bumpNumber(value) {
    const match = String(value).match(/^(.*?)(\d+)(\D*)$/);

    if (!match) {
        return value;
    }

    const next = String(parseInt(match[2], 10) + 1).padStart(match[2].length, '0');
    return `${match[1]}${next}${match[3]}`;
}

function applyTool(x, y) {
    if (tool.value === 'wall') {
        store.setWall(x, y);
        return;
    }

    if (tool.value === 'entrance') {
        store.setEntrance(x, y);
        return;
    }

    if (tool.value === 'erase') {
        store.erase(x, y);
        return;
    }

    // shelf
    const existing = cellLookup.value[key(x, y)];

    if (existing?.type === 'shelf') {
        // Clicking an existing shelf renames it.
        const name = window.prompt('Shelf number', existing.number);

        if (name !== null && name.trim()) {
            store.setShelf(x, y, name.trim());
        }

        return;
    }

    store.setShelf(x, y, nextNumber.value.trim() || '?');
    nextNumber.value = bumpNumber(nextNumber.value);
}

function onCellDown(x, y) {
    painting.value = true;
    applyTool(x, y);
}

function onCellEnter(x, y) {
    if (!painting.value) {
        return;
    }

    // Drag-paint is for the bulk tools; shelves are placed one click at a time
    // so their numbers stay meaningful.
    if (tool.value === 'wall' || tool.value === 'erase') {
        applyTool(x, y);
    }
}

function stopPainting() {
    painting.value = false;
}

function applyResize() {
    store.resize(resizeCols.value, resizeRows.value);
    resizeCols.value = store.map.cols;
    resizeRows.value = store.map.rows;
}

function confirmClear() {
    store.clear();
    resizeCols.value = store.map.cols;
    resizeRows.value = store.map.rows;
    showClear.value = false;
}

function loadBackup() {
    importError.value = '';
    importedOk.value = false;

    if (!backupText.value.trim()) {
        importError.value = 'Paste a map JSON first.';
        return;
    }

    if (store.importJson(backupText.value)) {
        importedOk.value = true;
        resizeCols.value = store.map.cols;
        resizeRows.value = store.map.rows;
    } else {
        importError.value = 'That does not look like a valid map JSON.';
    }
}

function fillBackup() {
    backupText.value = store.exportJson();
}

async function copyBackup() {
    fillBackup();

    try {
        await navigator.clipboard.writeText(backupText.value);
    } catch {
        /* clipboard blocked — the textarea still holds the JSON to copy by hand */
    }
}

const tools = [
    { key: 'shelf', label: 'Shelf' },
    { key: 'wall', label: 'Wall / blocked' },
    { key: 'entrance', label: 'Entrance' },
    { key: 'erase', label: 'Erase' },
];
</script>

<template>
    <AppLayout title="Shelf map" fluid>
        <FullWidthBox title="Shelf map" :collapsible="false">
            <template #actions>
                <RouterLink
                    to="/warehouse/pick"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    Build pick route →
                </RouterLink>
            </template>

            <p class="mb-4 text-sm text-gray-500">
                Draw your storage layout: place numbered <strong>shelves</strong>, mark
                <strong>walls</strong> or blocked areas the picker cannot walk through, and set one
                <strong>entrance</strong> (the start of every route). Everything is saved in this
                browser only.
            </p>

            <div class="mb-4 flex flex-wrap items-end gap-4">
                <div>
                    <span class="mb-1 block text-xs font-medium uppercase text-gray-500">Tool</span>
                    <div class="flex gap-1 rounded border border-gray-300 p-1">
                        <button
                            v-for="t in tools"
                            :key="t.key"
                            type="button"
                            class="rounded px-3 py-1 text-sm"
                            :class="tool === t.key ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                            @click="tool = t.key"
                        >{{ t.label }}</button>
                    </div>
                </div>

                <label class="block">
                    <span class="mb-1 block text-xs font-medium uppercase text-gray-500">Next shelf #</span>
                    <input
                        v-model="nextNumber"
                        type="text"
                        class="w-32 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        :disabled="tool !== 'shelf'"
                    >
                </label>

                <div class="flex items-end gap-2">
                    <label class="block">
                        <span class="mb-1 block text-xs font-medium uppercase text-gray-500">Cols</span>
                        <input v-model.number="resizeCols" type="number" min="2" max="120" class="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm">
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-xs font-medium uppercase text-gray-500">Rows</span>
                        <input v-model.number="resizeRows" type="number" min="2" max="120" class="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm">
                    </label>
                    <Button type="button" size="sm" @click="applyResize">Resize</Button>
                </div>

                <Button type="button" variant="danger" size="sm" @click="showClear = true">Clear map</Button>
            </div>

            <div class="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
                <span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-slate-300" /> shelf</span>
                <span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-gray-400" /> wall</span>
                <span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-green-600" /> entrance</span>
                <span>{{ store.shelfCount }} shelves</span>
                <span v-if="store.duplicateShelfNumbers.length" class="font-medium text-red-600">
                    duplicate numbers: {{ store.duplicateShelfNumbers.join(', ') }}
                </span>
                <span v-if="!store.map.entrance" class="font-medium text-amber-600">no entrance set</span>
            </div>

            <div class="overflow-auto rounded border border-gray-200 bg-gray-50" style="max-height: 70vh;">
                <svg
                    :width="width"
                    :height="height"
                    :viewBox="`0 0 ${width} ${height}`"
                    class="block touch-none select-none"
                    @pointerup="stopPainting"
                    @pointerleave="stopPainting"
                >
                    <template v-for="y in rows" :key="`row${y - 1}`">
                        <g v-for="x in cols" :key="`cell${x - 1},${y - 1}`">
                            <rect
                                :x="PAD + (x - 1) * CELL"
                                :y="PAD + (y - 1) * CELL"
                                :width="CELL"
                                :height="CELL"
                                stroke="#e5e7eb"
                                stroke-width="1"
                                class="cursor-pointer"
                                :class="cellClass(x - 1, y - 1)"
                                @pointerdown.prevent="onCellDown(x - 1, y - 1)"
                                @pointerenter="onCellEnter(x - 1, y - 1)"
                            />
                            <text
                                v-if="shelfNumberAt(x - 1, y - 1)"
                                :x="PAD + (x - 1) * CELL + CELL / 2"
                                :y="PAD + (y - 1) * CELL + CELL / 2"
                                text-anchor="middle"
                                dominant-baseline="central"
                                font-size="10"
                                fill="#334155"
                                class="pointer-events-none select-none"
                            >{{ shelfNumberAt(x - 1, y - 1) }}</text>
                            <text
                                v-else-if="store.map.entrance && store.map.entrance.x === x - 1 && store.map.entrance.y === y - 1"
                                :x="PAD + (x - 1) * CELL + CELL / 2"
                                :y="PAD + (y - 1) * CELL + CELL / 2"
                                text-anchor="middle"
                                dominant-baseline="central"
                                font-size="9"
                                fill="#fff"
                                class="pointer-events-none select-none"
                            >IN</text>
                        </g>
                    </template>
                </svg>
            </div>
        </FullWidthBox>

        <FullWidthBox title="Backup / move to another machine" class="mt-6" :default-collapsed="true">
            <p class="mb-2 text-sm text-gray-500">
                The map lives only in this browser. Copy this JSON to back it up, or paste a saved
                map and load it here.
            </p>
            <textarea
                v-model="backupText"
                rows="8"
                class="w-full rounded border border-gray-300 p-2 font-mono text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Map JSON…"
            />
            <p v-if="importError" class="mt-1 text-sm text-red-600">{{ importError }}</p>
            <p v-if="importedOk" class="mt-1 text-sm text-green-600">Map loaded.</p>
            <div class="mt-2 flex gap-2">
                <Button type="button" size="sm" @click="fillBackup">Show current JSON</Button>
                <Button type="button" size="sm" @click="copyBackup">Copy</Button>
                <Button type="button" size="sm" variant="primary" @click="loadBackup">Load from JSON</Button>
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="showClear"
            title="Clear the whole map?"
            message="Every shelf, wall and the entrance will be removed. This cannot be undone."
            confirm-label="Yes, clear it"
            @confirm="confirmClear"
            @cancel="showClear = false"
        />
    </AppLayout>
</template>
