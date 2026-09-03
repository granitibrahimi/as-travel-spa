/**
 * Pure grid / pathfinding helpers for the warehouse picking route.
 *
 * These functions have no Vue or store dependencies so the routing logic stays
 * easy to reason about and unit-test in isolation. The reactive map lives in
 * `src/stores/warehouse.js`; everything here takes a plain snapshot of it.
 *
 * Map model:
 *   {
 *     cols, rows,
 *     entrance: { x, y } | null,      // the picker's start cell (a walkable cell)
 *     cells: { "x,y": { type, number? } }
 *   }
 *
 * `type` is `'shelf'` (carries a `number`) or `'wall'`. Any coordinate not
 * present in `cells` is a walkable aisle. Movement is 4-directional between
 * walkable cells; a shelf is "reached" by standing on any walkable cell
 * orthogonally adjacent to it.
 */

export const key = (x, y) => `${x},${y}`;

export const parseKey = (k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
};

const DIRECTIONS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

export function isWalkable(map, x, y) {
    if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) {
        return false;
    }

    // Shelves and walls block movement; every other cell is a walkable aisle.
    return !map.cells[key(x, y)];
}

/** Walkable cells orthogonally adjacent to (x, y). */
export function accessPoints(map, x, y) {
    const points = [];

    for (const [dx, dy] of DIRECTIONS) {
        if (isWalkable(map, x + dx, y + dy)) {
            points.push({ x: x + dx, y: y + dy });
        }
    }

    return points;
}

/**
 * Breadth-first flood fill from one or more source cells over walkable cells.
 * Returns `{ dist, prev }` maps keyed by `"x,y"`: `dist` is the step count from
 * the nearest source, `prev` is the predecessor cell key on that shortest path
 * (absent for source cells, so a path walked back via `prev` ends at a source).
 */
export function bfs(map, sources) {
    const dist = new Map();
    const prev = new Map();
    const queue = [];

    for (const source of sources) {
        if (!isWalkable(map, source.x, source.y)) {
            continue;
        }

        const k = key(source.x, source.y);

        if (!dist.has(k)) {
            dist.set(k, 0);
            queue.push(source);
        }
    }

    for (let head = 0; head < queue.length; head++) {
        const { x, y } = queue[head];
        const base = dist.get(key(x, y));

        for (const [dx, dy] of DIRECTIONS) {
            const nx = x + dx;
            const ny = y + dy;

            if (!isWalkable(map, nx, ny)) {
                continue;
            }

            const nk = key(nx, ny);

            if (dist.has(nk)) {
                continue;
            }

            dist.set(nk, base + 1);
            prev.set(nk, key(x, y));
            queue.push({ x: nx, y: ny });
        }
    }

    return { dist, prev };
}

/**
 * Walk a `prev` map back from `goalKey` to its source, returning the path as an
 * ordered array of `{ x, y }` (source first, goal last). Returns `null` if the
 * goal was never reached.
 */
export function reconstructPath(prev, dist, goalKey) {
    if (!dist.has(goalKey)) {
        return null;
    }

    const path = [];
    let cursor = goalKey;

    while (cursor) {
        path.push(parseKey(cursor));
        cursor = prev.get(cursor);
    }

    return path.reverse();
}

/**
 * Group the map's shelf cells by their (trimmed, string) shelf number.
 * Returns a Map of number -> array of `{ x, y }` cells (a shelf number may span
 * several cells, or be reused by mistake).
 */
export function shelfCellsByNumber(map) {
    const groups = new Map();

    for (const [k, cell] of Object.entries(map.cells)) {
        if (cell.type !== 'shelf') {
            continue;
        }

        const number = String(cell.number ?? '').trim();

        if (!number) {
            continue;
        }

        if (!groups.has(number)) {
            groups.set(number, []);
        }

        groups.get(number).push(parseKey(k));
    }

    return groups;
}

/**
 * Parse a free-text list of requested shelves into `{ number, qty }` rows.
 *
 * Accepts one shelf per line or several separated by commas / semicolons, with
 * an optional quantity written as `A12 x3`, `A12 * 3`, `A12:3` or `A12 3`.
 * Repeated numbers are merged and their quantities summed. Order of first
 * appearance is preserved.
 */
export function parseShelfRequest(text) {
    const rows = new Map();

    const tokens = String(text || '')
        .split(/[\n,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);

    for (const token of tokens) {
        const match = token.match(/^(.*?)(?:\s*[x*:×]\s*|\s+)(\d+)$/i);
        let number;
        let qty;

        if (match && match[1].trim()) {
            number = match[1].trim();
            qty = parseInt(match[2], 10) || 1;
        } else {
            number = token;
            qty = 1;
        }

        const existing = rows.get(number);
        rows.set(number, { number, qty: (existing?.qty ?? 0) + qty });
    }

    return [...rows.values()];
}

function tourCost(matrix, order) {
    if (!order.length) {
        return 0;
    }

    let cost = matrix.start[order[0]];

    for (let i = 0; i < order.length - 1; i++) {
        cost += matrix.between[order[i]][order[i + 1]];
    }

    // The picker walks back to the entrance to drop the order off.
    cost += matrix.end[order[order.length - 1]];

    return cost;
}

/** 2-opt: reverse segments of an open tour while it shortens (approx matrix). */
function twoOpt(matrix, seed) {
    let order = seed.slice();
    let improved = true;

    while (improved) {
        improved = false;

        for (let i = 0; i < order.length - 1; i++) {
            for (let j = i + 1; j < order.length; j++) {
                const candidate = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));

                if (tourCost(matrix, candidate) + 1e-9 < tourCost(matrix, order)) {
                    order = candidate;
                    improved = true;
                }
            }
        }
    }

    return order;
}

/** Nearest-neighbour order over the approximate matrix, starting at `first`
 *  (an index) or at the entrance when `first` is -1. */
function nearestNeighbour(matrix, count, first) {
    const remaining = new Set();
    for (let i = 0; i < count; i++) {
        remaining.add(i);
    }

    const order = [];
    let current = first;

    if (first >= 0) {
        order.push(first);
        remaining.delete(first);
    }

    while (remaining.size) {
        let best = null;
        let bestDist = Infinity;

        for (const candidate of remaining) {
            const d = current < 0 ? matrix.start[candidate] : matrix.between[current][candidate];

            if (d < bestDist) {
                bestDist = d;
                best = candidate;
            }
        }

        order.push(best);
        remaining.delete(best);
        current = best;
    }

    return order;
}

/**
 * Produce a set of candidate visit orders worth scoring by their real walked
 * cost: nearest-neighbour from the entrance and from every shelf, each also
 * run through 2-opt on the approximate matrix.
 */
function candidateOrders(matrix, count) {
    if (count <= 1) {
        return [count === 1 ? [0] : []];
    }

    const seeds = [nearestNeighbour(matrix, count, -1)];

    for (let i = 0; i < count; i++) {
        seeds.push(nearestNeighbour(matrix, count, i));
    }

    const orders = [];
    const seen = new Set();

    for (const seed of seeds) {
        for (const order of [seed, twoOpt(matrix, seed)]) {
            const sig = order.join(',');

            if (!seen.has(sig)) {
                seen.add(sig);
                orders.push(order);
            }
        }
    }

    return orders;
}

/**
 * Plan an ordered pick route from the map's entrance through every requested
 * shelf and back to the entrance (the picker returns to drop the order off),
 * choosing a near-optimal shelf-by-shelf sequence.
 *
 * @param {object} map      Map snapshot (see module docblock).
 * @param {Array}  requests `[{ number, qty }]` from `parseShelfRequest`.
 * @returns {{
 *   ok: boolean,
 *   error: string | null,
 *   stops: Array<{ seq, number, qty, cell, steps, cumulativeSteps }>,
 *   path: Array<{ x, y }>,
 *   returnSteps: number,   // last stop -> entrance
 *   totalSteps: number,    // whole loop, incl. the return leg
 *   missing: string[],
 *   unreachable: string[]
 * }}
 */
export function planRoute(map, requests) {
    const empty = {
        ok: false,
        error: null,
        stops: [],
        path: [],
        returnSteps: 0,
        totalSteps: 0,
        missing: [],
        unreachable: [],
    };

    if (!map.entrance || !isWalkable(map, map.entrance.x, map.entrance.y)) {
        return { ...empty, error: 'Set an entrance on the map first — it is the start of every route.' };
    }

    if (!requests.length) {
        return { ...empty, error: 'Enter at least one shelf number.' };
    }

    const byNumber = shelfCellsByNumber(map);
    const missing = [];
    const unreachable = [];

    // Resolve each requested shelf number to its access points (walkable cells
    // adjacent to any cell carrying that number).
    const targets = [];

    for (const request of requests) {
        const cells = byNumber.get(request.number);

        if (!cells || !cells.length) {
            missing.push(request.number);
            continue;
        }

        const access = [];
        const seen = new Set();

        for (const cell of cells) {
            for (const point of accessPoints(map, cell.x, cell.y)) {
                const k = key(point.x, point.y);

                if (!seen.has(k)) {
                    seen.add(k);
                    access.push({ ...point, shelf: cell });
                }
            }
        }

        if (!access.length) {
            unreachable.push(request.number);
            continue;
        }

        targets.push({ number: request.number, qty: request.qty, cells, access });
    }

    const entranceKey = key(map.entrance.x, map.entrance.y);
    const entranceBfs = bfs(map, [map.entrance]);

    // For every reachable shelf, flood the grid from *each* of its access
    // points separately. This gives exact, symmetric distances between any two
    // access points (and the path between them), so the planner can choose
    // which end of each shelf to stand at — the choice that actually decides a
    // warehouse route's length.
    const reachable = [];

    for (const target of targets) {
        const points = [];

        for (const point of target.access) {
            const pk = key(point.x, point.y);
            const fromEntrance = entranceBfs.dist.get(pk);

            points.push({
                key: pk,
                x: point.x,
                y: point.y,
                shelf: point.shelf,
                flood: bfs(map, [point]),
                fromEntrance: fromEntrance === undefined ? Infinity : fromEntrance,
            });
        }

        if (points.every((p) => p.fromEntrance === Infinity)) {
            unreachable.push(target.number);
            continue;
        }

        reachable.push({ number: target.number, qty: target.qty, cells: target.cells, points });
    }

    if (!reachable.length) {
        return {
            ...empty,
            error: missing.length || unreachable.length
                ? 'None of the requested shelves could be reached from the entrance.'
                : 'Nothing to route.',
            missing,
            unreachable,
        };
    }

    const n = reachable.length;

    // Distance between the two shelves, minimised over every pair of their
    // access points — an under-estimate of the real leg cost (it ignores which
    // end you must leave from), but good enough to seed candidate visit orders.
    const legLowerBound = (i, j) => {
        let best = Infinity;

        for (const a of reachable[i].points) {
            for (const b of reachable[j].points) {
                const d = a.flood.dist.get(b.key);

                if (d !== undefined && d < best) {
                    best = d;
                }
            }
        }

        return best;
    };

    const toEntrance = (point) => {
        const d = point.flood.dist.get(entranceKey);
        return d === undefined ? Infinity : d;
    };

    const matrix = {
        start: reachable.map((t) => Math.min(...t.points.map((p) => p.fromEntrance))),
        between: reachable.map((_, i) => reachable.map((__, j) => (i === j ? 0 : legLowerBound(i, j)))),
        end: reachable.map((t) => Math.min(...t.points.map(toEntrance))),
    };

    // Exact cost of a given visit order, choosing the best access point at each
    // shelf (a shortest-path DP / Viterbi over the fixed sequence). Also returns
    // the chosen access-point key per position for path reconstruction.
    const solveOrder = (order) => {
        let layer = [{ key: entranceKey, cost: 0 }];
        const back = [];

        for (let step = 0; step < order.length; step++) {
            const points = reachable[order[step]].points;
            const next = [];
            const choice = {};

            for (const point of points) {
                let bestCost = Infinity;
                let bestPrev = null;

                for (const prev of layer) {
                    if (prev.cost === Infinity) {
                        continue;
                    }

                    const d = step === 0
                        ? point.fromEntrance
                        : reachable[order[step - 1]].points.find((p) => p.key === prev.key).flood.dist.get(point.key);

                    const total = d === undefined || d === Infinity ? Infinity : prev.cost + d;

                    if (total < bestCost) {
                        bestCost = total;
                        bestPrev = prev.key;
                    }
                }

                next.push({ key: point.key, cost: bestCost });
                choice[point.key] = bestPrev;
            }

            back.push(choice);
            layer = next;
        }

        // Close the loop: add the walk from each candidate last access point
        // back to the entrance, so the DP also picks the best end to finish on.
        let endCost = Infinity;
        let endKey = null;

        if (order.length) {
            const lastPoints = reachable[order[order.length - 1]].points;

            for (const entry of layer) {
                if (entry.cost === Infinity) {
                    continue;
                }

                const backHome = lastPoints.find((p) => p.key === entry.key).flood.dist.get(entranceKey);
                const total = backHome === undefined ? Infinity : entry.cost + backHome;

                if (total < endCost) {
                    endCost = total;
                    endKey = entry.key;
                }
            }
        }

        if (endKey === null || endCost === Infinity) {
            return { cost: Infinity, chosen: [] };
        }

        const chosen = new Array(order.length);
        let cursor = endKey;

        for (let step = order.length - 1; step >= 0; step--) {
            chosen[step] = cursor;
            cursor = back[step][cursor];
        }

        return { cost: endCost, chosen };
    };

    // 2-opt on an open tour, accepting a segment reversal only when the exact
    // per-order cost (with optimal access-point choices) actually improves.
    const twoOptExact = (seed) => {
        let order = seed.slice();
        let cost = solveOrder(order).cost;
        let improved = true;

        while (improved) {
            improved = false;

            for (let i = 0; i < order.length - 1; i++) {
                for (let j = i + 1; j < order.length; j++) {
                    const candidate = order.slice(0, i)
                        .concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
                    const candidateCost = solveOrder(candidate).cost;

                    if (candidateCost + 1e-9 < cost) {
                        order = candidate;
                        cost = candidateCost;
                        improved = true;
                    }
                }
            }
        }

        return order;
    };

    // Seed with cheap heuristics, then polish the promising ones against the
    // exact cost and keep the best order overall.
    let bestOrder = null;
    let bestSolution = null;

    for (const seed of candidateOrders(matrix, n)) {
        for (const order of [seed, twoOptExact(seed)]) {
            const solution = solveOrder(order);

            if (solution.cost !== Infinity && (!bestSolution || solution.cost < bestSolution.cost)) {
                bestSolution = solution;
                bestOrder = order;
            }
        }
    }

    if (!bestOrder) {
        return { ...empty, error: 'Could not build a walkable route through the requested shelves.', missing, unreachable };
    }

    // Materialise the winning order into stops + a continuous walking path.
    const stops = [];
    const path = [parseKey(entranceKey)];
    let cumulative = 0;

    for (let seq = 0; seq < bestOrder.length; seq++) {
        const target = reachable[bestOrder[seq]];
        const standKey = bestSolution.chosen[seq];
        const standPoint = target.points.find((p) => p.key === standKey);

        const fromFlood = seq === 0
            ? entranceBfs
            : reachable[bestOrder[seq - 1]].points.find((p) => p.key === bestSolution.chosen[seq - 1]).flood;

        const legDist = fromFlood.dist.get(standKey) ?? 0;
        const legPath = reconstructPath(fromFlood.prev, fromFlood.dist, standKey) ?? [];

        for (let p = 1; p < legPath.length; p++) {
            path.push(legPath[p]);
        }

        cumulative += legDist;

        stops.push({
            seq: seq + 1,
            number: target.number,
            qty: target.qty,
            cell: { x: standPoint.shelf.x, y: standPoint.shelf.y },
            stand: { x: standPoint.x, y: standPoint.y },
            steps: legDist,
            cumulativeSteps: cumulative,
        });
    }

    // Return leg: walk from the last stop back to the entrance to drop off.
    const lastFlood = reachable[bestOrder[bestOrder.length - 1]].points
        .find((p) => p.key === bestSolution.chosen[bestSolution.chosen.length - 1]).flood;
    const returnSteps = lastFlood.dist.get(entranceKey) ?? 0;
    const returnPath = reconstructPath(lastFlood.prev, lastFlood.dist, entranceKey) ?? [];

    for (let p = 1; p < returnPath.length; p++) {
        path.push(returnPath[p]);
    }

    cumulative += returnSteps;

    return {
        ok: true,
        error: null,
        stops,
        path,
        returnSteps,
        totalSteps: cumulative,
        missing,
        unreachable: [...new Set(unreachable)],
    };
}
