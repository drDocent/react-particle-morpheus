import { MasksGenerators } from "./maskGenerators";
// co przyjmuje:
// - szerokość i wysokość obszaru
// - funkcję do generowania maski czasów
// - funkcję do generowania początkowego stanu cząsteczki
// - maxParticles
// - rectX, rectY

import type { TimeMaskGenerator, Particle, ParticlePhysics, ParticleStyle, ParticleLife } from "./types";
import { ParticleInitialStates } from "./particleInitialStates";
// co zwraca:
// - maskę czasów
// - tablicę mask dla obiektu children
// - tablicę czasów dla poszczególnych cząsteczek
// - tablicę cząsteczek

export interface WorkerRequest {
    requestId: number;
    width: number;
    height: number;
    rectX: number;
    rectY: number;
    maxParticles: number;
    maskGeneratorName: keyof typeof MasksGenerators;
    particleInitialStateName: keyof typeof ParticleInitialStates; // opcjonalnie, jeśli chcemy, żeby worker od razu ustawił początkowy stan cząsteczek
}

export interface WorkerSuccessResponse {
    type: 'SUCCESS';
    requestId: number;
    timeArray: number[];
    maskBlobs: Blob[];
    particles: Particle[];
}

export interface WorkerErrorResponse {
    type: 'ERROR';
    requestId: number;
    errorMessage: string;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

// Fallback dla crypto.randomUUID(), aby zachować standardowy format (8-4-4-4-12) nawet na HTTP / w starszych przeglądarkach
function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function generateMasks(canvas: OffscreenCanvasRenderingContext2D, timeMask: number[][], timeArray: number[]) {
    const mapa = new Map<number, [number, number][]>(); // Map<czas, Array<[x, y]>>
    for (let x = 0; x < timeMask.length; x++) {
        for (let y = 0; y < timeMask[x].length; y++) {
            const t = timeMask[x][y];
            if (!mapa.has(t)) {
                mapa.set(t, []);
            }
            mapa.get(t)!.push([x, y]);
        }
    }

    const maskBlobs: Blob[] = [];

    for(let i = 0; i < timeArray.length; i++) {
        const t = timeArray[i];
        const coords = mapa.get(t);
        if(coords) {
            coords.forEach(([x, y]) => {
                canvas.clearRect(x, y, 1, 1); // Czas minął -> usuwamy piksel z maski (przezroczysty)
            });
        }
        const blob = await canvas.canvas.convertToBlob({ type: 'image/png' });
        maskBlobs.push(blob);
    }
    return maskBlobs;
}

self.onmessage = async function (e) {
    const { requestId, width, height, rectX, rectY, maxParticles, maskGeneratorName, particleInitialStateName }: WorkerRequest = e.data;

    try {
    const timeMaskGenerator: TimeMaskGenerator = MasksGenerators[maskGeneratorName];
    const particleInitialState = ParticleInitialStates[particleInitialStateName];

    const pixelWidth = Math.ceil(Math.sqrt((width * height) / maxParticles));
    const pixelHeight = Math.ceil((width * height) / maxParticles / pixelWidth);

    const cols = Math.ceil(width / pixelWidth);
    const rows = Math.ceil(height / pixelHeight);

    const { mask: timeMask, timeArray } = timeMaskGenerator(cols, rows);
    const sortedTimeArray = timeArray.sort((a: number, b: number) => a - b);

    const newParticlesList: Particle[] = [];

    let colIndex = 0;
    for (let x = 0; x < width; x += pixelWidth) {
        let rowIndex = 0;
        for (let y = 0; y < height; y += pixelHeight) {
            const originX = rectX + x;
            const originY = rectY + y;

            const pWidth = Math.min(pixelWidth, width - x);
            const pHeight = Math.min(pixelHeight, height - y);

            const particlePhysics: ParticlePhysics = {
                velocityX: 0,
                velocityY: 0,
                accelerationX: 0,
                accelerationY: 0,
            };

            const particleStyle: ParticleStyle = {
                opacity: 1,
                sprite: {
                    sourceX: x,
                    sourceY: y,
                },
            };

            const spawnTime = timeMask[colIndex][rowIndex];

            const particleLife: ParticleLife = {
                spawnTime,
                age: 0,
                lifetime: Infinity,
                isDead: false,
                hasSpawned: false,
            };

            const particle: Particle = {
                // Optymalizacja #19: Fallback na generator UUID w przypadku braku crypto w web worker (np. brak ssl)
                id: generateUUID(),
                originX,
                originY,
                x: originX,
                y: originY,
                width: pWidth,
                height: pHeight,
                particlePhysics,
                particleStyle,
                particleLife,
            };
            particleInitialState(particle);
            newParticlesList.push(particle);
            rowIndex++;
        }
        colIndex++;
    }


    const maskCanvas = new OffscreenCanvas(cols, rows);
    maskCanvas.width = cols;
    maskCanvas.height = rows;

    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskCtx) return;
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, cols, rows); // Zaczynamy od pełnej maski (przycisk jest cały widoczny)

    const maskBlobs: Blob[] = await generateMasks(maskCtx, timeMask, sortedTimeArray);

    self.postMessage({ 
        type: 'SUCCESS',
        requestId,
        timeMask, 
        timeArray: sortedTimeArray, 
        maskBlobs, 
        particles: newParticlesList 
    } as WorkerSuccessResponse);
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            requestId,
            errorMessage: error instanceof Error ? error.message : String(error),
        } as WorkerErrorResponse);
    }
}