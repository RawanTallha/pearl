import { simulationFrames } from '../data/mockData.js';
let index = 0;
export function getCurrentFrame() {
    if (simulationFrames.length === 0) {
        return [];
    }
    return simulationFrames[index % simulationFrames.length] ?? [];
}
export function advanceFrame() {
    if (simulationFrames.length === 0) {
        return [];
    }
    index = (index + 1) % simulationFrames.length;
    return getCurrentFrame();
}
export function resetSimulation() {
    index = 0;
}
//# sourceMappingURL=simulation.js.map