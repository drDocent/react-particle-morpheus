import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { toCanvas } from "html-to-image";
import type { Particle, ParticleLife, ParticleStyle, ParticlePhysics } from "./types";

interface ParticleWrapperProps {
    children: React.ReactNode;

    config?: {
        maxParticles?: number;
        fps?: number;
    };

    onStart?: () => void;
    onEnd?: () => void;

    particleInitialState: (particle: Particle) => Particle;
    particleEffect: (particle: Particle, deltaTime: number) => Particle | null;
}

export interface ParticleWrapperRef {
    reset: () => void;
    start: () => void;
    stop: () => void;
}

export const ParticleWrapper = forwardRef<ParticleWrapperRef, ParticleWrapperProps>(({
    children,
    config: userConfig,
    onStart = () => { },
    onEnd = () => { },
    particleInitialState,
    particleEffect,
}, ref) => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [isRunning, setIsRunning] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const childrenRef = useRef<HTMLDivElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const timerMaskRef = useRef<number[][]>([]);
    const elementMaskRef = useRef<string[]>([]);
    const timeArrayRef = useRef<number[]>([]);

    const particles = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>(0);

    const config = {
        maxParticles: userConfig?.maxParticles ?? 2000,
        fps: userConfig?.fps ?? 120,
    };

    // Renderuje children do offscreen canvas za pomocą html-to-image i tworzy listę cząsteczek
    const setupComponent = useCallback(async (element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect();

        try {
            // html-to-image toCanvas zwraca HTMLCanvasElement z wyrenderowanym DOM-em
            const canvas = await toCanvas(element, {
                width: element.offsetWidth,
                height: element.offsetHeight,
                pixelRatio: 1,
            });

            offscreenCanvasRef.current = canvas;

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const newParticlesList: Particle[] = [];

            const pixelWidth = Math.ceil(Math.sqrt(imgWidth * imgHeight / config.maxParticles));
            const pixelHeight = Math.ceil(imgWidth * imgHeight / config.maxParticles / pixelWidth);

            for (let x = 0; x < imgWidth; x += pixelWidth) {
                for (let y = 0; y < imgHeight; y += pixelHeight) {
                    const originX = rect.x + x;
                    const originY = rect.y + y;

                    const pWidth = Math.min(pixelWidth, rect.x + rect.width - originX);
                    const pHeight = Math.min(pixelHeight, rect.y + rect.height - originY);

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

                    const particleLife: ParticleLife = {
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

                    newParticlesList.push(particleInitialState(particle));
                }
            }

            particles.current = newParticlesList;


            const cols = Math.ceil(imgWidth / pixelWidth);
            const rows = Math.ceil(imgHeight / pixelHeight);

            const timeArray:number[] = [];

            //logika renderowania maski z bombami (kiedy ma się pojawić cząsteczka, a kiedy nie)
            for(let x = 0; x < cols; x++) {
                timerMaskRef.current[x] = [];
                for(let y = 0; y < rows; y++) {
                    timerMaskRef.current[x][y] = Math.random() * 2; // losowy czas od 0 do 5 sekund, po którym cząsteczka zacznie się rozpadać
                    if(timeArray.find(t => t === timerMaskRef.current[x][y]) === undefined) {
                        timeArray.push(timerMaskRef.current[x][y]);
                    }
                }
            }
            const sortedTimeArray = timeArray.sort((a, b) => a - b);
            timeArrayRef.current = sortedTimeArray;

            //logika renderowania maski 
            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = cols;
            maskCanvas.height = rows;
            const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
            if (!maskCtx) return;
            elementMaskRef.current = [];
            maskCtx.fillStyle = "black";
            maskCtx.fillRect(0, 0, cols, rows); // Zaczynamy od pełnej maski (przycisk jest cały widoczny)

            for(let i = 0; i < sortedTimeArray.length; i++) {
                const t = sortedTimeArray[i];
                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        if(timerMaskRef.current[x][y] <= t) {
                            maskCtx.clearRect(x, y, 1, 1); // Czas minął -> usuwamy piksel z maski (przezroczysty)
                        }                        
                    }
                }
                elementMaskRef.current.push(maskCanvas.toDataURL('image/png'));
            }
        } catch (err) {
            console.error("html-to-image: nie udało się wyrenderować elementu", err);
        }
    }, [config.maxParticles, particleInitialState]);

    const drawParticles = useCallback(() => {
        const canvas = canvasRef.current;
        const offscreen = offscreenCanvasRef.current;
        if (!canvas || !offscreen) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const particle of particles.current) {
            ctx.globalAlpha = particle.particleStyle.opacity;
            ctx.drawImage(
                offscreen,
                particle.particleStyle.sprite.sourceX,
                particle.particleStyle.sprite.sourceY,
                particle.width,
                particle.height,
                particle.x,
                particle.y,
                particle.width,
                particle.height,
            );
        }

        ctx.globalAlpha = 1.0;
    }, []);

    // Pętla animacji
    useEffect(() => {
        if (!isRunning) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let lastTime = 0;
        const interval = 1000 / config.fps;
        let running = true;

        let lastMaskIndex = 0;
        let animationStartTime: number | null = null;

        function frame(currentTime: number) {
            if (!running) return;
            animationFrameRef.current = requestAnimationFrame(frame);

            // Inicjalizujemy czas startu, żeby wiedzieć ile minęło sekund
            if (animationStartTime === null) {
                animationStartTime = currentTime;
            }
            
            const elapsedTime = (currentTime - animationStartTime) / 1000; // sekundy
            
            // Podmiana maski z cache
            if (childrenRef.current && lastMaskIndex < timeArrayRef.current.length) {
                let updatedMask = false;
                // Przesuwamy indeks tak długo, jak elapsed łapie się w progi z timeArray
                while (lastMaskIndex < timeArrayRef.current.length && elapsedTime >= timeArrayRef.current[lastMaskIndex]) {
                    lastMaskIndex++;
                    updatedMask = true;
                }
                
                if (updatedMask && lastMaskIndex > 0) {
                    const maskDataUrl = elementMaskRef.current[lastMaskIndex - 1];
                    childrenRef.current.style.maskImage = `url(${maskDataUrl})`;
                }
            }

            const delta = currentTime - lastTime;
            if (delta < interval) return;
            lastTime = currentTime;

            const newParticles: Particle[] = [];
            for (const p of particles.current) {
                const updated = particleEffect(p, Math.min(delta / 1000, 0.1));
                if (updated !== null) {
                    newParticles.push(updated);
                }
            }
            particles.current = newParticles;

            if (newParticles.length === 0) {
                running = false;
                onEnd();
                return;
            }

            drawParticles();
        }

        animationFrameRef.current = requestAnimationFrame(frame);

        return () => {
            running = false;
            cancelAnimationFrame(animationFrameRef.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [isRunning, config.fps, particleEffect, drawParticles, onEnd]);

    // Inicjalizacja cząsteczek przy montowaniu i zmianie rozmiaru okna
    useEffect(() => {
        if (!childrenRef.current) return;
        setupComponent(childrenRef.current);
    }, [setupComponent, windowSize]);

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useImperativeHandle(ref, () => ({
        reset: () => {
            setIsRunning(false);
            if (childrenRef.current) {
                childrenRef.current.style.maskImage = "none";
                const element = childrenRef.current;
                setupComponent(element);
            }
        },
        start: () => {
            onStart();
            setIsRunning(true);
        },
        stop: () => {
            setIsRunning(false);
        },
    }));

    return (
        <div>
            <div ref={childrenRef}>
                {children}
            </div>
            <canvas
                width={windowSize.width}
                height={windowSize.height}
                style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none" }}
                ref={canvasRef}
            />
        </div>
    );
});