export type TimeMaskGenerator = (width: number, height: number) => { mask: number[][]; timeArray: number[] };

const roundTimeDelay = (delay: number, bins: number = 50) => Math.round(delay * bins) / bins;

export const diagonalMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const maxDistance = width + height - 2;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const distance = x + y;
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(distance / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const leftToRightMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const maxDistance = width - 1;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(x / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const rightToLeftMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const maxDistance = width - 1;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay((width - 1 - x) / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const topToBottomMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const maxDistance = height - 1;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(y / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const bottomToTopMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const maxDistance = height - 1;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay((height - 1 - y) / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const sandMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = Array.from({ length: width }, () => new Array(height).fill(0));

    let time = 0;
    const timeIncrement = 5 / 1000; // 50ms w sekundach
    const blockSize = 3;

    let isLeftToRight = true;
    for(let y = height-1; y >= 0; y-= blockSize) {
        for(let i = 0; i < blockSize && y - i >= 0; i++) {
            for(let x = 0; x < width; x++) {
                const dist = isLeftToRight ? x : (width - 1 - x);
                const timeDelay = time + dist * timeIncrement;
                mask[x][y-i] = timeDelay;
                uniqueTimes.add(timeDelay);
            }
        }
        time += timeIncrement * width; // Każdy kolejny blok startuje po zakończeniu poprzedniego
        isLeftToRight = !isLeftToRight; // Odwrócenie kierunku fali co blok
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}
