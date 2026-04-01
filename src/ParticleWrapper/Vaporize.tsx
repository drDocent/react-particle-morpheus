import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement, forwardRef, useImperativeHandle, useMemo } from "react";
import type { VaporizeConfig } from "./types";
import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import { toCanvas } from "html-to-image";
import ParticleWorker from "./worker?worker&inline";
import type { WorkerRequest, WorkerSuccessResponse } from "./worker";
import type { Particle } from "./types";

interface VaporizeProps {
    children: React.ReactNode;

    config?: Partial<VaporizeConfig>;

    onStart?: () => void;
    onShatterFinished?: () => void; // wywoływane, gdy orginalny komponent będzie w pełni rozbity na cząsteczki
    onEnd?: () => void;
    onReset?: () => void;

    timeMaskGenerator: keyof typeof MasksGenerators; // klucz generatora maski z obiektu MasksGenerators
    particleInitialState: keyof typeof ParticleInitialStates; // klucz stanu początkowego z obiektu ParticleInitialStates
    particleEffect: keyof typeof ParticleEffects; // klucz efektu cząsteczek z obiektu ParticleEffects
}

export interface VaporizeRef {
    start: () => void; // metoda do uruchomienia/wznowienia animacji cząsteczek
    stop: () => void; // metoda do zatrzymania animacji cząsteczek (pauza)
    reset: () => void; // metoda do zresetowania animacji cząsteczek (wraca do stanu początkowego)
    refreshSnapshot: () => void; // metoda do odświeżenia snapshotu children (przydatne, gdy children się zmienia, ALE NIE ZMIENIA SIĘ JEGO ROZMIAR)
    rebuild: () => void; // metoda do całkowitego przebudowania cząsteczek (przydatne, gdy children się zmienia i zmienia swój rozmiar)

    isReady: () => boolean; // metoda do sprawdzenia, czy cząsteczki są gotowe do startu (np. czy worker zakończył generowanie cząsteczek)
    isRunning: () => boolean; // metoda do sprawdzenia, czy animacja cząsteczek jest aktualnie uruchomiona
}

type SetupStatus = "loading" | "ready" | "error";
type SetupState = {
    snapshot: SetupStatus;
    particles: SetupStatus;
    childrenMasks: SetupStatus;
    timeArray: SetupStatus;
}

const Vaporize = forwardRef<VaporizeRef, VaporizeProps>(({
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
    // Stany
    const [childrenElement, setChildrenElement] = useState<HTMLElement | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [setupState, setSetupState] = useState<SetupState>({
        snapshot: "loading",
        particles: "loading",
        childrenMasks: "loading",
        timeArray: "loading",
    });
    // Optymalizacja #15: Zamiana useState z windowSize na useRef uniknie bezsensownych re-renderów Reacta (#15)
    // Przy resize jedynie aktualizujemy DOM canvasa, bez wymuszania regeneracji children.
    const windowSizeRef = useRef({
        width: typeof window !== 'undefined' ? window.innerWidth : 1000,
        height: typeof window !== 'undefined' ? window.innerHeight : 1000,
    });


    //Refy
    const particlesRef = useRef<Particle[]>([]); //referencja do aktualnej listy cząsteczek, która jest renderowana na canvasie, przydatna do modyfikowania właściwości cząsteczek w czasie rzeczywistym (np. przy zmianie efektu cząsteczek)

    const childrenRef = useRef<HTMLElement | null>(null); //referencja do children ( tych sklonowanych )
    const snapshotRef = useRef<HTMLCanvasElement | null>(null); //referencja do snapshotu children, przydatna do generowania masek dla poszczególnych części children
    const canvasRef = useRef<HTMLCanvasElement>(null); //referencja do canvasa renderującego particle

    const workerRef = useRef<Worker | null>(null); //referencja do workera generującego cząsteczki
    const workerRequestIdRef = useRef(0); //referencja do ID requestu wysyłanego do workera, przydatne do odróżnienia odpowiedzi, gdy jest wysyłanych wiele requestów pod rząd (np. przy szybkim refreshu snapshotu)

    const timeArrayRef = useRef<number[]>([]); //referencja do tablicy czasów dla poszczególnych cząsteczek, przydatna do modyfikowania czasu życia cząsteczek w czasie rzeczywistym (np. przy zmianie efektu cząsteczek)
    const childrenMasksRef = useRef<string[]>([]); //referencja do tablicy masek dla poszczególnych części children, przydatna do modyfikowania wyglądu cząsteczek w czasie rzeczywistym (np. przy zmianie efektu cząsteczek)

    const elapsedTimeRef = useRef(0); //czas trwania animacji z uwzględnieniem ew. pauz
    const lastFrameTimeRef = useRef<number | null>(null); //czas ostatniej klatki animacji, przydatny do obliczania deltaTime między klatkami
    const lastMaskIndexRef = useRef(0); //indeks ostatniej użytej maski, przydatny do cyklicznego stosowania masek

    const shatterFinishedCalledRef = useRef(false); //flaga do sprawdzenia, czy onShatterFinished zostało już wywołane, przydatna do uniknięcia wielokrotnego wywoływania tego callbacku, gdy wiele cząsteczek umiera w tym samym czasie

    const isRunningRef = useRef(false); // Fix race condition: synchroniczna flaga do natychmiastowego zatrzymania pętli animacji bez czekania na asynchroniczny React state update

    // Zmienne przeliczane
    const isReady = Object.values(setupState).every(status => status === "ready");
    const config = useMemo<VaporizeConfig>(() => ({
        maxParticles: 1000,
        fps: 60,
        ...userConfig,
    }), [userConfig]);
    const frameDuration = 1000 / config.fps;
    const resolvedParticleInitialState = ParticleInitialStates[particleInitialState];
    const resolvedParticleEffect = ParticleEffects[particleEffect];

    const handleChildrenRef = useCallback((node: HTMLElement | null) => {
        childrenRef.current = node;
        setChildrenElement(node); // To informuje React: "Hej, mam już DOM!"
    }, []);

    const renderedChildren = isValidElement(children)
        ? cloneElement(children as React.ReactElement<any>, {
            ref: handleChildrenRef,
        })
        : <div ref={handleChildrenRef}>{children}</div>;


    // funckje pomocnicze
    const clearMaskStyles = useCallback((element: HTMLElement) => {
        element.style.maskImage = "none";
        element.style.setProperty('-webkit-mask-image', 'none');
    }, []);

    const applyMaskStyles = useCallback((element: HTMLElement, maskDataUrl: string) => {
        element.style.maskImage = `url(${maskDataUrl})`;
        element.style.maskSize = "100% 100%";
        element.style.maskRepeat = "no-repeat";
        element.style.imageRendering = "pixelated";
        element.style.setProperty('-webkit-mask-image', `url(${maskDataUrl})`);
        element.style.setProperty('-webkit-mask-size', '100% 100%');
        element.style.setProperty('-webkit-mask-repeat', 'no-repeat');
    }, []);

    const blobToDataUrl = useCallback((blob: Blob) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error ?? new Error("Nie udało się odczytać blob jako data URL"));
            reader.readAsDataURL(blob);
        });
    }, []);

    // Data URL to zwykły string base64 — nie wymaga ręcznego zwalniania.
    // Stare stringi są automatycznie GC-owane, gdy childrenMasksRef.current zostanie nadpisany.
    const clearMaskRefs = useCallback(() => {
        childrenMasksRef.current = [];
    }, []);

    const drawParticles = useCallback((ctx: CanvasRenderingContext2D, elapsedTime: number) => {
        const snapshot = snapshotRef.current;
        if (!snapshot) return;

        // Czyścimy cały canvas przed nową klatką
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        for (let i = 0; i < particlesRef.current.length; i++) {
            const p = particlesRef.current[i];

            // 1. Skip if dead or not yet spawned
            if (p.particleLife.isDead || elapsedTime < p.particleLife.spawnTime) continue;
            if (p.particleStyle.opacity <= 0.01) continue; // nie rysuj kompletnie przezroczystych cząsteczek

            // 2. Set opacity for this particle
            ctx.globalAlpha = p.particleStyle.opacity;

            // 3. Draw fragment of the snapshot
            // sX, sY, sW, sH -> źródło (snapshot)
            // dX, dY, dW, dH -> cel (główny canvas)
            ctx.drawImage(
                snapshot,
                p.particleStyle.sprite.sourceX,
                p.particleStyle.sprite.sourceY,
                p.width,
                p.height,
                p.x,
                p.y,
                p.width,
                p.height
            );
        }

        // Resetujemy opacity, żeby nie wpływało na inne operacje (dobra praktyka)
        ctx.globalAlpha = 1.0;
    }, []);

    // UseEffecty

    // Obsługa zmiany rozmiaru okna
    useEffect(() => {
        let timeoutId: number;
        function handleResize() {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                windowSizeRef.current = {
                    width: window.innerWidth,
                    height: window.innerHeight,
                };
                if (canvasRef.current) {
                    canvasRef.current.width = windowSizeRef.current.width;
                    canvasRef.current.height = windowSizeRef.current.height;
                }
            }, 100);
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Początkowy setup - tworzenie snapshotu children, generowanie timeMaski, tworzenie cząsteczek, generowanie masek dla poszczególnych części children, generowanie timeArray
    useEffect(() => {
        if (!childrenElement) return;

        let cancelled = false;

        async function setup() {
            if (!childrenRef.current || cancelled) return;
            const element = childrenRef.current;
            const { x: rectX, y: rectY } = element.getBoundingClientRect();

            try {
                setSetupState(prev => ({ ...prev, snapshot: "loading" }));
                clearMaskStyles(element);
                const snapshot = await toCanvas(element, {
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    pixelRatio: 1,
                });

                if (cancelled) return;

                snapshotRef.current = snapshot;

                setSetupState(prev => ({ ...prev, snapshot: "ready" }));
                const imgWidth = snapshot.width;
                const imgHeight = snapshot.height;


                //zabijamy starego workera, jeśli istnieje
                workerRef.current?.terminate();

                //tworzymy nowego workera
                const requestId = ++workerRequestIdRef.current; // inkrementujemy ID requestu
                const worker = new ParticleWorker();
                workerRef.current = worker;

                setSetupState(prev => ({
                    ...prev,
                    particles: "loading",
                    childrenMasks: "loading",
                    timeArray: "loading",
                }));

                try {
                    const workerData = await new Promise((resolve, reject) => {
                        const handleMessage = (e: MessageEvent) => {
                            if (e.data.requestId !== requestId) return

                            if (e.data.type === 'SUCCESS') {
                                cleanup();
                                resolve(e.data);
                            } else if (e.data.type === 'ERROR') {
                                cleanup();
                                reject(new Error(e.data.errorMessage || 'Nieznany błąd workera'));
                            }
                        }

                        const handleError = (e: ErrorEvent) => {
                            cleanup();
                            reject(new Error(`Worker error: ${e.message}`));
                        }

                        const cleanup = () => {
                            worker.removeEventListener('message', handleMessage);
                            worker.removeEventListener('error', handleError);
                        }

                        worker.addEventListener('message', handleMessage);
                        worker.addEventListener('error', handleError);

                        worker.postMessage({
                            requestId,
                            width: imgWidth,
                            height: imgHeight,
                            rectX: rectX,
                            rectY: rectY,
                            maxParticles: config.maxParticles,
                            maskGeneratorName: timeMaskGenerator,
                            particleInitialStateName: particleInitialState,
                        } as WorkerRequest);
                    })

                    if (cancelled) return;

                    const { particles, maskBlobs, timeArray } = workerData as WorkerSuccessResponse;

                    particlesRef.current = particles;
                    timeArrayRef.current = timeArray;

                    if (maskBlobs) {
                        clearMaskRefs();
                        childrenMasksRef.current = await Promise.all(maskBlobs.map(blobToDataUrl));
                        setSetupState(prev => ({
                            ...prev,
                            particles: particles ? "ready" : "error",
                            timeArray: timeArray ? "ready" : "error",
                            childrenMasks: "ready"
                        }));
                    } else {
                        setSetupState(prev => ({ ...prev, childrenMasks: "error" }));
                    }

                } catch (error) {
                    if (!cancelled) {
                        setSetupState(prev => ({
                            ...prev,
                            particles: "error",
                            childrenMasks: "error",
                            timeArray: "error",
                        }));
                    }
                }

            } catch (error) {
                if (!cancelled) {
                    setSetupState(prev => ({ ...prev, snapshot: "error" }));
                }
            }
        }
        setup();

        return () => {
            cancelled = true;
            //czyszczenie zasobów związanych z workerem i blobami
            workerRef.current?.terminate();
            workerRef.current = null;
            clearMaskRefs();
        }
    }, [childrenElement, timeMaskGenerator, particleInitialState, config.maxParticles, clearMaskStyles, blobToDataUrl, clearMaskRefs]);

    // Animacja cząsteczek - główna pętla animacji, która aktualizuje właściwości cząsteczek na podstawie timeArray i efektu cząsteczek, a następnie renderuje je na canvasie
    useEffect(() => {
        if (!isRunning || !isReady) return;

        let animationFrameId: number;

        function frame(currentTime: number) {
            // Fix race condition: sprawdzamy synchroniczną flagę zamiast React state,
            // dzięki czemu stop()/reset() natychmiast zatrzymuje pętlę bez czekania na re-render
            if (!isRunningRef.current) return;

            if (lastFrameTimeRef.current === null) {
                lastFrameTimeRef.current = currentTime;
            }
            if (currentTime - lastFrameTimeRef.current < frameDuration) {
                animationFrameId = requestAnimationFrame(frame);
                return;
            }
            const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000; // w sekundach
            lastFrameTimeRef.current = currentTime;
            elapsedTimeRef.current += deltaTime;

            const elapsedTime = elapsedTimeRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;

            //Aktualizacja masek
            if (childrenRef.current && timeArrayRef.current.length > 0 && lastMaskIndexRef.current <= timeArrayRef.current.length) {
                let maskChanged = false;

                while (lastMaskIndexRef.current < timeArrayRef.current.length && elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current]) {
                    lastMaskIndexRef.current++;
                    maskChanged = true;
                }

                if (
                    lastMaskIndexRef.current === timeArrayRef.current.length
                    && elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current - 1] + 0.05
                ) {
                    lastMaskIndexRef.current++;
                    maskChanged = true;
                }

                if (maskChanged && lastMaskIndexRef.current > 1) {
                    const maskUrl = childrenMasksRef.current[lastMaskIndexRef.current - 2];
                    if (maskUrl) {
                        applyMaskStyles(childrenRef.current, maskUrl);
                    }
                }

                if (!shatterFinishedCalledRef.current && lastMaskIndexRef.current > timeArrayRef.current.length) {
                    shatterFinishedCalledRef.current = true;
                    onShatterFinished();
                }
            }

            //Aktualizacja cząsteczek
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let allDead = true; // flaga do sprawdzenia, czy wszystkie cząsteczki są martwe

            if(!childrenRef.current) return;
            const { x: rectX, y: rectY } = childrenRef.current.getBoundingClientRect(); 

            particlesRef.current.forEach(particle => {
                if(!particle.particleLife.hasSpawned){
                    particle.originX = rectX + particle.particleStyle.sprite.sourceX;
                    particle.originY = rectY + particle.particleStyle.sprite.sourceY;
                    particle.x = particle.originX;
                    particle.y = particle.originY;
                }
                if (elapsedTime < particle.particleLife.spawnTime) {
                    allDead = false;
                    return; // cząsteczka jeszcze się nie ma pojawić w tej klatce
                }
                particle.particleLife.hasSpawned = true; // oznaczamy, że cząsteczka się już pojawiła

                if (particle.particleLife.isDead) return; // cząsteczka już jest martwa

                allDead = false;
                particle.particleLife.age += deltaTime;
                resolvedParticleEffect(particle, deltaTime);
            });

            if (allDead) {
                // Optymalizacja #18 wyczyść ekran po skończonej bitwie gdy padną cząsteczki ;)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                isRunningRef.current = false;
                setIsRunning(false);
                onEnd();
            } else {
                drawParticles(ctx, elapsedTime);
                animationFrameId = requestAnimationFrame(frame);
            }
        }
        
        animationFrameId = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(animationFrameId);
            lastFrameTimeRef.current = null;
        }
    }, [isRunning, isReady, applyMaskStyles, drawParticles, onEnd, onShatterFinished, resolvedParticleEffect])


    // Metody dostępne z zewnątrz przez ref
    const start = useCallback(() => {
        if (!isReady || isRunning) return;
        isRunningRef.current = true;
        setIsRunning(true);
        onStart();
    }, [isReady, isRunning, onStart]);

    const stop = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        elapsedTimeRef.current = 0;
        lastMaskIndexRef.current = 0;
        shatterFinishedCalledRef.current = false;

        if (childrenRef.current) {
            clearMaskStyles(childrenRef.current);
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }

        particlesRef.current.forEach(p => {
            p.particlePhysics.velocityX = 0;
            p.particlePhysics.velocityY = 0;
            p.particlePhysics.accelerationX = 0;
            p.particlePhysics.accelerationY = 0;
            p.particleLife.isDead = false;
            p.particleLife.age = 0;
            p.particleLife.hasSpawned = false;
            p.particleStyle.opacity = 1;
            resolvedParticleInitialState(p);
        });

        onReset();
    }, [clearMaskStyles, resolvedParticleInitialState, onReset]);

    const refreshSnapshot = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        // Resetujemy stan konfiguracji, co ponownie wymusi wykonanie efektu "setup" 
        // (pobranie nowego snapshotu i uruchomienie workera i reset czasu)
        elapsedTimeRef.current = 0;
        lastMaskIndexRef.current = 0;
        shatterFinishedCalledRef.current = false;
        setSetupState({
            snapshot: "loading",
            particles: "loading",
            childrenMasks: "loading",
            timeArray: "loading",
        });
    }, []);

    const rebuild = useCallback(() => {
        // rebuild() może działać identycznie jak refreshSnapshot w naszej implementacji,
        // bo wywołanie efektu setup wylicza od nowa również ilość cząsteczek, tablice czasu itp.
        refreshSnapshot();
    }, [refreshSnapshot]);


    useImperativeHandle(ref, () => ({
        start,
        stop,
        reset,
        refreshSnapshot,
        rebuild,
        isReady: () => Object.values(setupState).every(status => status === "ready"),
        isRunning: () => isRunning,
    }), [start, stop, reset, refreshSnapshot, rebuild, isRunning, setupState]);

    return (
        <div>
            {renderedChildren}
            <canvas
                width={windowSizeRef.current.width}
                height={windowSizeRef.current.height}
                style={{ 
                    position: "fixed", 
                    top: 0, 
                    left: 0, 
                    pointerEvents: "none", 
                    width: '100vw', 
                    height: '100vh' 
                }}
                ref={canvasRef}
            />
        </div>
    );
});

export { Vaporize };