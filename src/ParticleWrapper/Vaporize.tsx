import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement, forwardRef, useImperativeHandle, useMemo } from "react";
import type { VaporizeConfig } from "./types";
import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import { toCanvas } from "html-to-image";
import ParticleWorker from "./worker?worker&inline";
import type { WorkerRequest, WorkerSuccessResponse } from "./worker";
import type { Particle } from "./types";
import { useParticles, type ParticleGroup } from "./PariclesProvider";

interface VaporizeProps {
    children: React.ReactNode;

    config?: Partial<VaporizeConfig>;

    onStart?: () => void;
    onShatterFinished?: () => void;
    onEnd?: () => void;
    onReset?: () => void;

    timeMaskGenerator: keyof typeof MasksGenerators;
    particleInitialState: keyof typeof ParticleInitialStates;
    particleEffect: keyof typeof ParticleEffects;
}

export interface VaporizeRef {
    start: () => void;
    stop: () => void;
    reset: () => void;
    resetAll: () => void;
    refreshSnapshot: () => void;
    saveSnapshot: (fileName?: string) => Promise<boolean>;

    isReady: () => boolean;
    isRunning: () => boolean;
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
    const { addGroup, removeGroup, startGroup, stopGroup, detachGroup, updateGroupSource } = useParticles();

    // Stabilne id dla tej instancji Vaporize — nie zmienia się przez cały cykl życia
    const idRef = useRef(crypto.randomUUID());

    // Stany
    const [childrenElement, setChildrenElement] = useState<HTMLElement | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [setupTrigger, setSetupTrigger] = useState(0);
    const [setupState, setSetupState] = useState<SetupState>({
        snapshot: "loading",
        particles: "loading",
        childrenMasks: "loading",
        timeArray: "loading",
    });

    // Refy
    const particlesRef = useRef<Particle[]>([]);
    const childrenRef = useRef<HTMLElement | null>(null);
    const snapshotRef = useRef<HTMLCanvasElement | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const workerRequestIdRef = useRef(0);

    const timeArrayRef = useRef<number[]>([]);
    const childrenMasksRef = useRef<string[]>([]);

    const lastMaskIndexRef = useRef(0);

    // Zmienne przeliczane
    const isReady = Object.values(setupState).every(status => status === "ready");
    const config = useMemo<VaporizeConfig>(() => ({
        maxParticles: 1000,
        fps: 60,
        autoInitialize: true,
        showLogs: false,
        ...userConfig,
    }), [userConfig]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const log = useCallback((...args: unknown[]) => {
        if (config.showLogs) console.log('[Vaporize]', ...args);
    }, [config.showLogs]);

    const resolvedParticleInitialState = ParticleInitialStates[particleInitialState];
    const resolvedParticleEffect = ParticleEffects[particleEffect];

    const handleChildrenRef = useCallback((node: HTMLElement | null) => {
        childrenRef.current = node;
        setChildrenElement(node);
    }, []);

    const renderedChildren = isValidElement(children)
        ? cloneElement(children as React.ReactElement<any>, {
            ref: handleChildrenRef,
        })
        : <div ref={handleChildrenRef}>{children}</div>;

    // Funkcje pomocnicze
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

    const clearMaskRefs = useCallback(() => {
        childrenMasksRef.current = [];
    }, []);

    // Callback wywoływany przez Provider w każdej klatce RAF — synchronizacja CSS maski z canvasem
    // Używa refs, więc jest stabilny i może być przekazany raz do addGroup
    const handleFrame = useCallback((_particles: Particle[], elapsedTime: number) => {
        if (!childrenRef.current || timeArrayRef.current.length === 0) return;
        if (lastMaskIndexRef.current > timeArrayRef.current.length) return;

        let maskChanged = false;

        while (
            lastMaskIndexRef.current < timeArrayRef.current.length &&
            elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current]
        ) {
            lastMaskIndexRef.current++;
            maskChanged = true;
        }

        if (
            lastMaskIndexRef.current === timeArrayRef.current.length &&
            elapsedTime >= timeArrayRef.current[lastMaskIndexRef.current - 1] + 0.05
        ) {
            lastMaskIndexRef.current++;
            maskChanged = true;
        }

        if (maskChanged && lastMaskIndexRef.current > 1) {
            const maskUrl = childrenMasksRef.current[lastMaskIndexRef.current - 2];
            if (maskUrl && childrenRef.current) {
                applyMaskStyles(childrenRef.current, maskUrl);
            }
        }

    }, [applyMaskStyles]);

    // Pomocnicze — buduje i rejestruje grupę w Providerze na podstawie aktualnego stanu refs
    const registerGroup = useCallback((particles: Particle[], snapshot: HTMLCanvasElement) => {
        const group: ParticleGroup = {
            id: idRef.current,
            isRunning: false,
            particles,
            startTime: 0,
            accumulatedElapsed: 0,
            sourceImg: snapshot,
            updatePhysics: resolvedParticleEffect,
            onFrame: handleFrame,
            onEnd: () => {
                log('onEnd — wszystkie cząsteczki martwe');
                setIsRunning(false);
                onEnd();
            },
            onShatter: () => {
                log('onShatterFinished — children w pełni rozbity na cząsteczki');
                onShatterFinished();
            },
        };
        // addGroup atomowo usuwa starą (jeśli istnieje) i wstawia nową
        addGroup(group);
    }, [resolvedParticleEffect, handleFrame, addGroup, onEnd, onShatterFinished, log]);

    // Cleanup przy odmontowaniu — particles żyją dalej na globalnym canvasie Providera
    useEffect(() => {
        return () => {
            detachGroup(idRef.current);
        };
    }, [detachGroup]);

    // Setup — snapshot + worker (bez zmian względem VaporizeOld)
    useEffect(() => {
        // Blokada ponownego setupu jeśli children zniknęły po rozbiciu
        if (!childrenElement || childrenElement.offsetHeight === 0 || childrenElement.offsetWidth === 0) return;
        
        if (!config.autoInitialize && setupTrigger === 0) {
            log('autoInitialize=false — pomijam setup, czekam na resetAll()');
            return;
        }

        let cancelled = false;

        async function setup() {
            if (!childrenRef.current || cancelled) return;
            const element = childrenRef.current;
            const { x: rectX, y: rectY } = element.getBoundingClientRect();

            try {
                log('setup() start — generowanie snapshotu...');
                setSetupState(prev => ({ ...prev, snapshot: "loading" }));
                clearMaskStyles(element);
                const snapshot = await toCanvas(element, {
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    pixelRatio: 1,
                });

                if (cancelled) return;

                snapshotRef.current = snapshot;
                log(`snapshot gotowy (${snapshot.width}x${snapshot.height}px)`);

                setSetupState(prev => ({ ...prev, snapshot: "ready" }));
                const imgWidth = snapshot.width;
                const imgHeight = snapshot.height;

                workerRef.current?.terminate();

                const requestId = ++workerRequestIdRef.current;
                log(`worker uruchomiony (requestId=${requestId}, maxParticles=${config.maxParticles}, maskGenerator=${timeMaskGenerator}, initialState=${particleInitialState})`);
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
                            if (e.data.requestId !== requestId) return;
                            if (e.data.type === 'SUCCESS') { cleanup(); resolve(e.data); }
                            else if (e.data.type === 'ERROR') { cleanup(); reject(new Error(e.data.errorMessage || 'Nieznany błąd workera')); }
                        };
                        const handleError = (e: ErrorEvent) => { cleanup(); reject(new Error(`Worker error: ${e.message}`)); };
                        const cleanup = () => {
                            worker.removeEventListener('message', handleMessage);
                            worker.removeEventListener('error', handleError);
                        };
                        worker.addEventListener('message', handleMessage);
                        worker.addEventListener('error', handleError);
                        worker.postMessage({
                            requestId,
                            width: imgWidth,
                            height: imgHeight,
                            rectX,
                            rectY,
                            maxParticles: config.maxParticles,
                            maskGeneratorName: timeMaskGenerator,
                            particleInitialStateName: particleInitialState,
                        } as WorkerRequest);
                    });

                    if (cancelled) return;

                    const { particles, maskBlobs, timeArray } = workerData as WorkerSuccessResponse;
                    log(`worker odpowiedział — cząsteczki: ${particles?.length ?? 0}, maski: ${maskBlobs?.length ?? 0}, timeArray: ${timeArray?.length ?? 0} wpisów`);

                    particlesRef.current = particles;
                    timeArrayRef.current = timeArray;

                    if (maskBlobs) {
                        clearMaskRefs();
                        childrenMasksRef.current = await Promise.all(maskBlobs.map(blobToDataUrl));

                        if (cancelled) return;

                        // Rejestrujemy grupę w globalnym Providerze
                        registerGroup(particles, snapshot);

                        log('setup zakończony sukcesem — komponent gotowy do startu');
                        setSetupState(prev => ({
                            ...prev,
                            particles: particles ? "ready" : "error",
                            timeArray: timeArray ? "ready" : "error",
                            childrenMasks: "ready",
                        }));
                    } else {
                        log('BŁĄD: brak masek od workera');
                        setSetupState(prev => ({ ...prev, childrenMasks: "error" }));
                    }

                } catch (error) {
                    if (!cancelled) {
                        log('BŁĄD workera:', error);
                        setSetupState(prev => ({ ...prev, particles: "error", childrenMasks: "error", timeArray: "error" }));
                    }
                }

            } catch (error) {
                if (!cancelled) {
                    log('BŁĄD generowania snapshotu:', error);
                    setSetupState(prev => ({ ...prev, snapshot: "error" }));
                }
            }
        }

        setup();

        return () => {
            cancelled = true;
            workerRef.current?.terminate();
            workerRef.current = null;
            clearMaskRefs();
        };
    }, [childrenElement, setupTrigger, config.autoInitialize, timeMaskGenerator, particleInitialState, config.maxParticles, clearMaskStyles, blobToDataUrl, clearMaskRefs, registerGroup, log]);

    // Metody dostępne z zewnątrz przez ref
    const start = useCallback(() => {
        if (!isReady || isRunning) {
            log(`start() zignorowany — isReady=${isReady}, isRunning=${isRunning}`);
            return;
        }
        log('start()');
        setIsRunning(true);
        startGroup(idRef.current);
        onStart();
    }, [isReady, isRunning, startGroup, onStart, log]);

    const stop = useCallback(() => {
        log('stop() — pauza');
        setIsRunning(false);
        stopGroup(idRef.current);
    }, [stopGroup, log]);

    const reset = useCallback(() => {
        log('reset() — reset stanu cząsteczek do stanu początkowego');
        setIsRunning(false);

        lastMaskIndexRef.current = 0;

        if (childrenRef.current) {
            clearMaskStyles(childrenRef.current);
        }

        // Zresetuj właściwości cząsteczek
        particlesRef.current.forEach(p => {
            p.x = p.originX;
            p.y = p.originY;
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

        // resetGroup atomowo usuwa starą i wstawia nową z isRunning: false
        if (snapshotRef.current) {
            registerGroup(particlesRef.current, snapshotRef.current);
        }

        onReset();
    }, [clearMaskStyles, resolvedParticleInitialState, registerGroup, onReset, log]);

    const refreshSnapshot = useCallback(async () => {
        if (!childrenRef.current) return false;
        log('refreshSnapshot() — odświeżanie snapshotu children');

        setIsRunning(false);
        clearMaskStyles(childrenRef.current);

        setSetupState(prev => ({ ...prev, snapshot: "loading" }));

        const element = childrenRef.current;
        const snapshot = await toCanvas(element, {
            width: element.offsetWidth,
            height: element.offsetHeight,
            pixelRatio: 1,
        });

        snapshotRef.current = snapshot;
        updateGroupSource(idRef.current, snapshot);
        setSetupState(prev => ({ ...prev, snapshot: "ready" }));
        log('refreshSnapshot() — nowy snapshot gotowy');
        return true;
    }, [clearMaskStyles, updateGroupSource, log]);

    const resetAll = useCallback(() => {
        log('resetAll() — totalny reset, wymuszam ponowny setup');

        setIsRunning(false);

        // Usuń grupę z Providera przed pełnym resetem
        removeGroup(idRef.current);

        setSetupState({
            snapshot: 'loading',
            particles: 'loading',
            childrenMasks: 'loading',
            timeArray: 'loading',
        });

        lastMaskIndexRef.current = 0;

        if (childrenRef.current) {
            clearMaskStyles(childrenRef.current);
        }

        particlesRef.current = [];
        timeArrayRef.current = [];
        clearMaskRefs();
        snapshotRef.current = null;

        workerRef.current?.terminate();
        workerRef.current = null;

        setSetupTrigger(prev => prev + 1);

        onReset();
    }, [removeGroup, clearMaskStyles, clearMaskRefs, onReset, log]);

    const saveSnapshot = useCallback(async (fileName = "vaporize-snapshot.png") => {
        const snapshot = snapshotRef.current;
        if (!snapshot) {
            log('saveSnapshot() — brak snapshotu, pomijam');
            return false;
        }
        log(`saveSnapshot() — zapisuję jako "${fileName}"`);

        const blob = await new Promise<Blob | null>((resolve) => {
            snapshot.toBlob(resolve, "image/png");
        });

        if (!blob) return false;

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        log('saveSnapshot() — plik zapisany');

        return true;
    }, [log]);

    useImperativeHandle(ref, () => ({
        start,
        stop,
        reset,
        resetAll,
        refreshSnapshot,
        saveSnapshot,
        isReady: () => Object.values(setupState).every(status => status === "ready"),
        isRunning: () => isRunning,
    }), [start, stop, reset, resetAll, refreshSnapshot, saveSnapshot, isRunning, setupState]);

    return (
        <div>
            {renderedChildren}
        </div>
    );
});

export { Vaporize };
