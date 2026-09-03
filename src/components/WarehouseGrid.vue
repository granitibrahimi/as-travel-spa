<script setup>
import { computed } from 'vue';
import { key } from '../helpers/warehouse.js';

/**
 * Read-only renderer for a warehouse shelf map, with an optional pick-route
 * overlay (walking path + numbered stop markers). The interactive editor draws
 * its own SVG; this component is for displaying a finished route.
 */
const props = defineProps({
    map: { type: Object, required: true },
    // Full walking path as ordered { x, y } cells.
    path: { type: Array, default: () => [] },
    // Ordered stops: { seq, number, cell: { x, y } }.
    stops: { type: Array, default: () => [] },
    // Shelf numbers to highlight even without a full route.
    highlight: { type: Array, default: () => [] },
    cellSize: { type: Number, default: 26 },
});

const pad = 8;

const width = computed(() => props.map.cols * props.cellSize + pad * 2);
const height = computed(() => props.map.rows * props.cellSize + pad * 2);

const cx = (x) => pad + x * props.cellSize + props.cellSize / 2;
const cy = (y) => pad + y * props.cellSize + props.cellSize / 2;

const highlightSet = computed(() => new Set(props.highlight.map((n) => String(n).trim())));
const stopByCell = computed(() => {
    const map = new Map();
    for (const stop of props.stops) {
        map.set(key(stop.cell.x, stop.cell.y), stop);
    }
    return map;
});

const shelfCells = computed(() =>
    Object.entries(props.map.cells)
        .filter(([, cell]) => cell.type === 'shelf')
        .map(([k, cell]) => {
            const [x, y] = k.split(',').map(Number);
            return { x, y, number: cell.number };
        }));

const wallCells = computed(() =>
    Object.entries(props.map.cells)
        .filter(([, cell]) => cell.type === 'wall')
        .map(([k]) => {
            const [x, y] = k.split(',').map(Number);
            return { x, y };
        }));

const pathData = computed(() => {
    if (props.path.length < 2) {
        return '';
    }

    return props.path
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${cx(point.x)} ${cy(point.y)}`)
        .join(' ');
});
</script>

<template>
    <div class="overflow-auto rounded border border-gray-200 bg-gray-50">
        <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="block">
            <!-- grid -->
            <g stroke="#e5e7eb" stroke-width="1">
                <line
                    v-for="col in map.cols + 1"
                    :key="`v${col}`"
                    :x1="pad + (col - 1) * cellSize"
                    :y1="pad"
                    :x2="pad + (col - 1) * cellSize"
                    :y2="pad + map.rows * cellSize"
                />
                <line
                    v-for="row in map.rows + 1"
                    :key="`h${row}`"
                    :x1="pad"
                    :y1="pad + (row - 1) * cellSize"
                    :x2="pad + map.cols * cellSize"
                    :y2="pad + (row - 1) * cellSize"
                />
            </g>

            <!-- walls -->
            <rect
                v-for="wall in wallCells"
                :key="`w${wall.x},${wall.y}`"
                :x="pad + wall.x * cellSize"
                :y="pad + wall.y * cellSize"
                :width="cellSize"
                :height="cellSize"
                fill="#9ca3af"
            />

            <!-- shelves -->
            <g>
                <template v-for="shelf in shelfCells" :key="`s${shelf.x},${shelf.y}`">
                    <rect
                        :x="pad + shelf.x * cellSize + 1"
                        :y="pad + shelf.y * cellSize + 1"
                        :width="cellSize - 2"
                        :height="cellSize - 2"
                        rx="3"
                        :fill="stopByCell.has(key(shelf.x, shelf.y))
                            ? '#dc2626'
                            : (highlightSet.has(String(shelf.number).trim()) ? '#fca5a5' : '#cbd5e1')"
                    />
                    <text
                        :x="cx(shelf.x)"
                        :y="cy(shelf.y)"
                        text-anchor="middle"
                        dominant-baseline="central"
                        :font-size="Math.max(7, cellSize * 0.34)"
                        :fill="stopByCell.has(key(shelf.x, shelf.y)) ? '#fff' : '#334155'"
                    >{{ shelf.number }}</text>
                </template>
            </g>

            <!-- entrance -->
            <g v-if="map.entrance">
                <rect
                    :x="pad + map.entrance.x * cellSize + 1"
                    :y="pad + map.entrance.y * cellSize + 1"
                    :width="cellSize - 2"
                    :height="cellSize - 2"
                    rx="3"
                    fill="#16a34a"
                />
                <text
                    :x="cx(map.entrance.x)"
                    :y="cy(map.entrance.y)"
                    text-anchor="middle"
                    dominant-baseline="central"
                    :font-size="Math.max(7, cellSize * 0.3)"
                    fill="#fff"
                >IN</text>
            </g>

            <!-- route path -->
            <path
                v-if="pathData"
                :d="pathData"
                fill="none"
                stroke="#dc2626"
                stroke-width="2.5"
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-dasharray="1 5"
                opacity="0.9"
            />

            <!-- stop order badges -->
            <g v-for="stop in stops" :key="`stop${stop.seq}`">
                <circle :cx="cx(stop.cell.x)" :cy="cy(stop.cell.y)" :r="Math.max(7, cellSize * 0.3)" fill="#111827" />
                <text
                    :x="cx(stop.cell.x)"
                    :y="cy(stop.cell.y)"
                    text-anchor="middle"
                    dominant-baseline="central"
                    :font-size="Math.max(8, cellSize * 0.34)"
                    fill="#fff"
                    font-weight="700"
                >{{ stop.seq }}</text>
            </g>
        </svg>
    </div>
</template>
