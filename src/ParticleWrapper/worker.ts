import { MasksGenerators } from "./maskGenerators";
// co przyjmuje:
// - szerokość i wysokość obszaru
// - funkcję do generowania maski czasów
// - funkcję do generowania początkowego stanu cząsteczki
// - maxParticles
// - rectX, rectY

import type { TimeMaskGenerator, Particle, ParticlePhysics, ParticleStyle, ParticleLife } from "../ParticleWrapper/types";
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

export interface WorkerResponse {
    type: 'SUCCESS';
    requestId: number;
    timeArray: number[];
    maskBlobs: Blob[];
    particles: Particle[];
    errorMessage?: string;
}

self.onmessage = async function (e) {
    const { requestId, width, height, rectX, rectY, maxParticles, maskGeneratorName, particleInitialStateName }: WorkerRequest = e.data;

    const timeMaskGenerator: TimeMaskGenerator = MasksGenerators[maskGeneratorName];
    const particleInitialState = ParticleInitialStates[particleInitialStateName];

    const pixelWidth = Math.ceil(Math.sqrt((width * height) / maxParticles));
    const pixelHeight = Math.ceil((width * height) / maxParticles / pixelWidth);

    const cols = Math.ceil(width / pixelWidth);
    const rows = Math.ceil(height / pixelHeight);

    const { mask: timeMask, timeArray } = timeMaskGenerator(cols, rows);
    const sortedTimeArray = timeArray.sort((a, b) => a - b);

    const newParticlesList: Particle[] = [];

    let colIndex = 0;
    for (let x = 0; x < width; x += pixelWidth) {
        let rowIndex = 0;
        for (let y = 0; y < height; y += pixelHeight) {
            const originX = rectX + x;
            const originY = rectY + y;

            const pWidth = Math.min(pixelWidth, rectX + width - originX);
            const pHeight = Math.min(pixelHeight, rectY + height - originY);

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
            };

            const particle: Particle = {
                id: crypto.randomUUID(),
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

    const maskBlobs: Blob[] = [];

    const maskCanvas = new OffscreenCanvas(cols, rows);
    maskCanvas.width = cols;
    maskCanvas.height = rows;

    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskCtx) return;
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, cols, rows); // Zaczynamy od pełnej maski (przycisk jest cały widoczny)

    for(let i = 0; i < sortedTimeArray.length; i++) {
        const t = sortedTimeArray[i];
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if(timeMask[x][y] <= t) {
                    maskCtx.clearRect(x, y, 1, 1); // Czas minął -> usuwamy piksel z maski (przezroczysty)
                }                        
            }
        }
        const blob = await maskCanvas.convertToBlob({ type: 'image/png' });
        maskBlobs.push(blob);
    }

    self.postMessage({ 
        type: 'SUCCESS',
        requestId,
        timeMask, 
        timeArray: sortedTimeArray, 
        maskBlobs, 
        particles: newParticlesList 
    } as WorkerResponse);
}