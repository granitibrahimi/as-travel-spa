import { defineStore } from 'pinia';
import { key } from '../helpers/warehouse';

/**
 * The warehouse shelf map — a 2D grid the user draws in the Shelf Map editor
 * and the pick-route planner reads. It is a **local, browser-only** tool: the
 * whole map lives in `localStorage` under `as.warehouseMap` and never touches
 * the platform API. Use the editor's Backup box to move it between machines.
 *
 * Grid model (mirrors `src/helpers/warehouse.js`):
 *   cells: { "x,y": { type: 'shelf', number } | { type: 'wall' } }
 * Any cell not listed is a walkable aisle. `entrance` is the picker's start.
 */

const STORAGE_KEY = 'as.warehouseMap';
const DEFAULT_COLS = 28;
const DEFAULT_ROWS = 18;
const MIN_SIZE = 2;
const MAX_SIZE = 120;

function blankMap() {
    return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS, entrance: null, cells: {} };
}

function normalise(raw) {
    if (!raw || typeof raw !== 'object') {
        return blankMap();
    }

    const cols = clampSize(raw.cols, DEFAULT_COLS);
    const rows = clampSize(raw.rows, DEFAULT_ROWS);
    const cells = {};

    for (const [k, cell] of Object.entries(raw.cells ?? {})) {
        if (!/^\d+,\d+$/.test(k) || !cell || typeof cell !== 'object') {
            continue;
        }

        const [x, y] = k.split(',').map(Number);

        if (x >= cols || y >= rows) {
            continue;
        }

        if (cell.type === 'shelf') {
            cells[k] = { type: 'shelf', number: String(cell.number ?? '').trim() };
        } else if (cell.type === 'wall') {
            cells[k] = { type: 'wall' };
        }
    }

    let entrance = null;

    if (raw.entrance && Number.isInteger(raw.entrance.x) && Number.isInteger(raw.entrance.y)
        && raw.entrance.x < cols && raw.entrance.y < rows && !cells[key(raw.entrance.x, raw.entrance.y)]) {
        entrance = { x: raw.entrance.x, y: raw.entrance.y };
    }

    return { cols, rows, entrance, cells };
}

function clampSize(value, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(MIN_SIZE, Math.min(MAX_SIZE, n)) : fallback;
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? normalise(JSON.parse(raw)) : blankMap();
    } catch {
        return blankMap();
    }
}

export const useWarehouseStore = defineStore('warehouse', {
    state: () => ({
        map: load(),
    }),

    getters: {
        shelves(state) {
            return Object.entries(state.map.cells)
                .filter(([, cell]) => cell.type === 'shelf')
                .map(([k, cell]) => {
                    const [x, y] = k.split(',').map(Number);
                    return { x, y, number: cell.number };
                });
        },

        // Shelf numbers used more than once on the map (usually a mistake worth
        // surfacing in the editor).
        duplicateShelfNumbers() {
            const counts = new Map();

            for (const shelf of this.shelves) {
                const number = String(shelf.number ?? '').trim();

                if (number) {
                    counts.set(number, (counts.get(number) ?? 0) + 1);
                }
            }

            return [...counts.entries()].filter(([, n]) => n > 1).map(([number]) => number);
        },

        shelfCount() {
            return this.shelves.length;
        },
    },

    actions: {
        persist() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.map));
            } catch {
                /* storage full or unavailable — the in-memory map still works */
            }
        },

        resize(cols, rows) {
            const nextCols = clampSize(cols, this.map.cols);
            const nextRows = clampSize(rows, this.map.rows);

            for (const k of Object.keys(this.map.cells)) {
                const [x, y] = k.split(',').map(Number);

                if (x >= nextCols || y >= nextRows) {
                    delete this.map.cells[k];
                }
            }

            if (this.map.entrance && (this.map.entrance.x >= nextCols || this.map.entrance.y >= nextRows)) {
                this.map.entrance = null;
            }

            this.map.cols = nextCols;
            this.map.rows = nextRows;
            this.persist();
        },

        setShelf(x, y, number) {
            this.map.cells[key(x, y)] = { type: 'shelf', number: String(number ?? '').trim() };
            this.clearEntranceIf(x, y);
            this.persist();
        },

        setWall(x, y) {
            this.map.cells[key(x, y)] = { type: 'wall' };
            this.clearEntranceIf(x, y);
            this.persist();
        },

        erase(x, y) {
            delete this.map.cells[key(x, y)];
            this.clearEntranceIf(x, y);
            this.persist();
        },

        setEntrance(x, y) {
            delete this.map.cells[key(x, y)];
            this.map.entrance = { x, y };
            this.persist();
        },

        clearEntranceIf(x, y) {
            if (this.map.entrance && this.map.entrance.x === x && this.map.entrance.y === y) {
                this.map.entrance = null;
            }
        },

        clear() {
            this.map = blankMap();
            this.persist();
        },

        /** Replace the whole map from imported JSON. Returns true on success. */
        importJson(text) {
            let parsed;

            try {
                parsed = JSON.parse(text);
            } catch {
                return false;
            }

            this.map = normalise(parsed);
            this.persist();
            return true;
        },

        exportJson() {
            return JSON.stringify(this.map, null, 2);
        },
    },
});
