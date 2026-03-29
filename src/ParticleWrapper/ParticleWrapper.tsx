import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { toCanvas } from "html-to-image";
import type { Particle } from "./types";
import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

interface ParticleWrapperProps {
    children: React.ReactNode;

    config?: {
        maxParticles?: number;
        fps?: number;
        rounded?: boolean;
    };

    onStart?: () => void;
    onShatterFinished?: () => void; // wywoływane, gdy orginalny komponent będzie w pełni rozbity na cząsteczki
    onEnd?: () => void;
    onReset?: () => void;

    timeMaskGenerator: keyof typeof MasksGenerators; // klucz generatora maski z obiektu MasksGenerators
    particleInitialState: keyof typeof ParticleInitialStates; // klucz stanu początkowego z obiektu ParticleInitialStates
    particleEffect: keyof typeof ParticleEffects; // klucz efektu cząsteczek z obiektu ParticleEffects
}

export interface ParticleWrapperRef {
    reset: () => void;
    hardReset: () => void; // reset z ponownym renderowaniem offscreen canvas, przydatny gdy dzieci się zmieniają
    start: () => void;
    stop: () => void;
}

const ParticleWrapper = forwardRef<ParticleWrapperRef, ParticleWrapperProps>(({
    children,
    config: userConfig,
    onStart = () => { },
    onEnd = () => { },
    onReset = () => { },
    onShatterFinished = () => { },
    timeMaskGenerator,
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
    const workerRef = useRef<Worker | null>(null);
    const workerRequestIdRef = useRef<number>(0);
    const maskObjectUrlsRef = useRef<string[]>([]);
    const setupSequenceRef = useRef<number>(0);

    const particles = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>(0);
    
    // Zmienne do śledzenia stanu postępu animacji i maski po zatrzymaniu (stop/start)
    const elapsedTimeRef = useRef<number>(0);
    const lastMaskIndexRef = useRef<number>(0);
    const shatterFinishedCalledRef = useRef<boolean>(false);

    const config = {
        maxParticles: userConfig?.maxParticles ?? 2000,
        fps: userConfig?.fps ?? 120,
        rounded: userConfig?.rounded ?? false,
    };

    const resolvedParticleInitialState = ParticleInitialStates[particleInitialState];
    const resolvedParticleEffect = ParticleEffects[particleEffect];

    const blobToDataUrl = useCallback((blob: Blob) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error ?? new Error("Nie udało się odczytać blob jako data URL"));
            reader.readAsDataURL(blob);
        });
    }, []);

    // Renderuje children do offscreen canvas za pomocą html-to-image i tworzy listę cząsteczek
    const setupComponent = useCallback(async (element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect();
        const setupSequence = setupSequenceRef.current + 1;
        setupSequenceRef.current = setupSequence;

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

            maskObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            maskObjectUrlsRef.current = [];
            elementMaskRef.current = [];

            const requestId = workerRequestIdRef.current + 1;
            workerRequestIdRef.current = requestId;

            workerRef.current?.terminate();
            workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

            const worker = workerRef.current;
            const workerData = await new Promise<{
                requestId: number;
                timeMask: number[][];
                timeArray: number[];
                maskBlobs: Blob[];
                particles: Particle[];
            }>((resolve, reject) => {
                let finished = false;

                const cleanup = () => {
                    worker.removeEventListener("message", handleMessage);
                    worker.removeEventListener("error", handleError);
                };

                const handleMessage = (event: MessageEvent) => {
                    if (finished) return;
                    const data = event.data;

                    if (!data || data.type !== "SUCCESS" || data.requestId !== requestId) {
                        return;
                    }

                    finished = true;
                    cleanup();
                    resolve(data);
                };

                const handleError = (errorEvent: ErrorEvent) => {
                    if (finished) return;
                    finished = true;
                    cleanup();
                    reject(errorEvent.error ?? new Error(errorEvent.message));
                };

                worker.addEventListener("message", handleMessage);
                worker.addEventListener("error", handleError);
                worker.postMessage({
                    requestId,
                    width: imgWidth,
                    height: imgHeight,
                    rectX: rect.x,
                    rectY: rect.y,
                    maxParticles: config.maxParticles,
                    maskGeneratorName: timeMaskGenerator,
                    particleInitialStateName: particleInitialState,
                });
            });

            if (setupSequence !== setupSequenceRef.current || requestId !== workerRequestIdRef.current) {
                return;
            }

            timerMaskRef.current = workerData.timeMask;
            timeArrayRef.current = workerData.timeArray;
            particles.current = workerData.particles;

            elementMaskRef.current = await Promise.all(workerData.maskBlobs.map(blobToDataUrl));
            
        } catch (err) {
            console.error("html-to-image: nie udało się wyrenderować elementu", err);
        }
    }, [blobToDataUrl, config.maxParticles, timeMaskGenerator, particleInitialState]);

    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
            maskObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            maskObjectUrlsRef.current = [];
        };
    }, []);

    const drawParticles = useCallback((elapsedTime: number) => {
        const canvas = canvasRef.current;
        const offscreen = offscreenCanvasRef.current;
        if (!canvas || !offscreen) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const particle of particles.current) {
            if (particle.particleLife.isDead) continue;
            if (elapsedTime < particle.particleLife.spawnTime) continue;

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

        let lastFrameTime: number | null = null;

        function frame(currentTime: number) {
            if (!running) return;
            animationFrameRef.current = requestAnimationFrame(frame);

            // Inicjalizujemy czas startu, żeby wiedzieć ile minęło sekund
            if (lastFrameTime === null) {
                lastFrameTime = currentTime;
            }
            
            const frameDeltaTime = (currentTime - lastFrameTime) / 1000; // sekundy
            lastFrameTime = currentTime;
            
            // Dodajemy czas jaki upłynął między tą a poprzednią klatką
            elapsedTimeRef.current += frameDeltaTime;
            const elapsedTime = elapsedTimeRef.current;
            
            // Podmiana maski z cache (z opóźnieniem "o jeden krok do tyłu")
            if (childrenRef.current && timeArrayRef.current.length > 0 && lastMaskIndexRef.current <= timeArrayRef.current.length) {
                let updatedMask = false;
                
                // Przesuwamy indeks tak długo, jak elapsed łapie się w progi z timeArray
                while (lastMaskIndexRef.current < timeArrayRef.current.length && elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current]) {
                    lastMaskIndexRef.current++;
                    updatedMask = true;
                }
                
                // Ponieważ opóźniamy maskę o jeden krok (nakładamy poprzednią), musimy dorobić sztuczny krok, 
                // aby nałożyć finalną warstwę wycięcia. Dodajemy małe opóźnienie (np. 0.05 sekundy) od ostatniej fali.
                if (lastMaskIndexRef.current === timeArrayRef.current.length && elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current - 1] + 0.05) {
                    lastMaskIndexRef.current++;
                    updatedMask = true;
                }
                
                if (updatedMask && lastMaskIndexRef.current > 1) {
                    // lastMaskIndexRef.current - 2 oznacza przeskoczenie "na poprzednią potencjalną maskę"
                    const maskDataUrl = elementMaskRef.current[lastMaskIndexRef.current - 2];

                    if (maskDataUrl) {
                        // Zastosuj styl maski na właściwym elemencie (dzieciach)
                        const targetEl = childrenRef.current;
                        
                        // Standaryzowane propercje
                        targetEl.style.maskImage = `url(${maskDataUrl})`;
                        targetEl.style.maskSize = "100% 100%";
                        targetEl.style.maskRepeat = "no-repeat";
                        targetEl.style.imageRendering = "pixelated";
                        
                        // Rozszerzenia WebKit, niezbędne w niektórych przeglądarkach (Safari, Opera, część Chrome)
                        targetEl.style.setProperty('-webkit-mask-image', `url(${maskDataUrl})`);
                        targetEl.style.setProperty('-webkit-mask-size', '100% 100%');
                        targetEl.style.setProperty('-webkit-mask-repeat', 'no-repeat');
                    }
                }
                if (!shatterFinishedCalledRef.current && lastMaskIndexRef.current > timeArrayRef.current.length) {
                    onShatterFinished();
                    shatterFinishedCalledRef.current = true;
                }
            }

            const delta = currentTime - lastTime;
            if (delta < interval) return;
            lastTime = currentTime;

            let allDead = true;

            for (let i = 0; i < particles.current.length; i++) {
                const p = particles.current[i];
                
                if (p.particleLife.isDead) continue;
                
                allDead = false;

                if (elapsedTime >= p.particleLife.spawnTime) {
                    resolvedParticleEffect(p, Math.min(delta / 1000, 0.1));
                }
            }

            if (allDead) {
                running = false;
                onEnd();
                return;
            }

            drawParticles(elapsedTime);
        }

        animationFrameRef.current = requestAnimationFrame(frame);

        return () => {
            running = false;
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isRunning, config.fps, resolvedParticleEffect, drawParticles, onEnd, onShatterFinished]);

    // Inicjalizacja cząsteczek przy montowaniu i zmianie rozmiaru okna
    useEffect(() => {
        if (!childrenRef.current) return;
        
        // Zdejmujemy maskę przed wykonaniem zrzutu html-to-image, 
        // aby nie zapisać w pamięci przycisku, który już zniknął (to powodowało puste, przezroczyste cząsteczki)
        childrenRef.current.style.maskImage = "none";
        childrenRef.current.style.setProperty('-webkit-mask-image', 'none');
        
        // Przy ponownym generowaniu cząsteczek bezpiecznie resetujemy również czasy
        elapsedTimeRef.current = 0;
        lastMaskIndexRef.current = 0;
        shatterFinishedCalledRef.current = false;
        
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

    function resetParticles() {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        elapsedTimeRef.current = 0;
        lastMaskIndexRef.current = 0;
        shatterFinishedCalledRef.current = false;
        
        for (let i = 0; i < particles.current.length; i++) {
            const p = particles.current[i];
            p.x = p.originX;
            p.y = p.originY;
            p.particlePhysics.velocityX = 0;
            p.particlePhysics.velocityY = 0;
            p.particlePhysics.accelerationX = 0;
            p.particlePhysics.accelerationY = 0;
            p.particleLife.isDead = false;
            p.particleLife.age = 0;
            p.particleStyle.opacity = 1;
            resolvedParticleInitialState(p);
        }
    }

    useImperativeHandle(ref, () => ({
        reset: () => {
            setIsRunning(false);
            if (childrenRef.current) {
                childrenRef.current.style.maskImage = "none";
                childrenRef.current.style.setProperty('-webkit-mask-image', 'none');
            }
            resetParticles();
            onReset();
        },
        hardReset: () => {
            setIsRunning(false);
            if (childrenRef.current) {
                childrenRef.current.style.maskImage = "none";
                childrenRef.current.style.setProperty('-webkit-mask-image', 'none');
                const element = childrenRef.current;
                setupComponent(element);
            }
            onReset();
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

export { ParticleWrapper };
export default ParticleWrapper;