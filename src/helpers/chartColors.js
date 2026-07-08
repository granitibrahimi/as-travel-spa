/**
 * Shared categorical palette for report charts, so every graph in the app
 * reads as one system. `color(i)` cycles the palette; `colors(n)` returns the
 * first n (cycling) for a pie/segmented chart.
 */
export const palette = [
    '#dc2626', // red-600 (brand)
    '#2563eb', // blue-600
    '#16a34a', // green-600
    '#d97706', // amber-600
    '#7c3aed', // violet-600
    '#0891b2', // cyan-600
    '#db2777', // pink-600
    '#65a30d', // lime-600
    '#ea580c', // orange-600
    '#4f46e5', // indigo-600
];

export function color(index) {
    return palette[index % palette.length];
}

export function colors(count) {
    return Array.from({ length: count }, (_, index) => color(index));
}
