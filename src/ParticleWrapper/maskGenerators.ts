import type { TimeMaskGenerator } from "./types";
const roundTimeDelay = (delay: number, bins: number = 50) => Math.round(delay * bins) / bins;

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

export type CornerDirection = "left-top" | "left-bottom" | "right-top" | "right-bottom";

const createDiagonalMask = (direction: CornerDirection): TimeMaskGenerator => {
    return (width: number, height: number) => {
        const uniqueTimes = new Set<number>();
        const mask: number[][] = [];
        const maxDistance = width + height - 2;

        for (let x = 0; x < width; x++) {
            const col: number[] = [];
            for (let y = 0; y < height; y++) {
                let distance = 0;
                switch (direction) {
                    case "left-top":
                        distance = x + y;
                        break;
                    case "right-top":
                        distance = (width - 1 - x) + y;
                        break;
                    case "left-bottom":
                        distance = x + (height - 1 - y);
                        break;
                    case "right-bottom":
                        distance = (width - 1 - x) + (height - 1 - y);
                        break;
                }
                const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(distance / maxDistance);
                uniqueTimes.add(timeDelay);
                col.push(timeDelay);
            }
            mask.push(col);
        }
        return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
    };
};

export const topLeftDiagonalMask = createDiagonalMask("left-top");
export const topRightDiagonalMask = createDiagonalMask("right-top");
export const bottomLeftDiagonalMask = createDiagonalMask("left-bottom");
export const bottomRightDiagonalMask = createDiagonalMask("right-bottom");

export const centerOutMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(distance / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const edgesInMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(1 - (distance / maxDistance));
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const splitHorizontalMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const centerX = width / 2;
    const maxDistance = centerX;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const distance = Math.abs(x - centerX);
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(distance / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const splitVerticalMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];
    const centerY = height / 2;
    const maxDistance = centerY;

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const distance = Math.abs(y - centerY);
            const timeDelay = maxDistance === 0 ? 0 : roundTimeDelay(distance / maxDistance);
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const randomMask: TimeMaskGenerator = (width, height) => {
    const uniqueTimes = new Set<number>();
    const mask: number[][] = [];

    for (let x = 0; x < width; x++) {
        const col: number[] = [];
        for (let y = 0; y < height; y++) {
            const timeDelay = roundTimeDelay(Math.random(), 20); // Mniej binów dla widocznego grupowania w losowości
            uniqueTimes.add(timeDelay);
            col.push(timeDelay);
        }
        mask.push(col);
    }
    return { mask, timeArray: Array.from(uniqueTimes).sort((a, b) => a - b) };
}

export const MasksGenerators = {
    leftToRight: leftToRightMask,
    rightToLeft: rightToLeftMask,
    topToBottom: topToBottomMask,
    bottomToTop: bottomToTopMask,
    topLeftDiagonal: topLeftDiagonalMask,
    topRightDiagonal: topRightDiagonalMask,
    bottomLeftDiagonal: bottomLeftDiagonalMask,
    bottomRightDiagonal: bottomRightDiagonalMask,
    sand: sandMask,
    centerOut: centerOutMask,
    edgesIn: edgesInMask,
    splitHorizontal: splitHorizontalMask,
    splitVertical: splitVerticalMask,
    random: randomMask,
}