"use client"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Particle, ParticleEffect } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParticleGroup {
  id: string;                       // generowane przez konsumenta: crypto.randomUUID()
  isRunning: boolean;
  particles: Particle[];
  startTime: number;
  sourceImg: HTMLCanvasElement;

  /** Funkcja aktualizująca fizykę pojedynczej cząsteczki — Provider wywoła ją co klatkę */
  updatePhysics: ParticleEffect;
  /** Wywoływany w tej samej klatce RAF po rysowaniu — do synchronizacji CSS maski z canvasem */
  onFrame?: (particles: Particle[], elapsedTime: number) => void;
  /** Wywoływany gdy wszystkie particles w grupie są martwe — Provider auto-usuwa grupę */
  onEnd?: () => void;
  /** Wywoływany gdy wszystkie cząsteczki się spawną (element w pełni rozbity) — Provider wywołuje raz */
  onShatter?: () => void;
  /** Flaga wewnętrzna Providera — czy onShatter już zostało wywołane dla tej grupy */
  shatterCalled?: boolean;
  /** Zakumulowany elapsed (ms) przy pauzie — pozwala wznowić animację od miejsca zatrzymania */
  accumulatedElapsed: number;
}

interface ParticlesContextType {
  /** Aktualnie mierzone FPS pętli animacji */
  fps: number;

  /** Dodaje grupę (particles gotowe, isRunning=false) */
  addGroup: (group: ParticleGroup) => void;
  /** Twardy reset — natychmiast kasuje grupę z mapy i canvasa */
  removeGroup: (id: string) => void;
  /** Ustawia isRunning=true + startTime — particles zaczynają żyć */
  startGroup: (id: string) => void;
  /** Odczepia callbacki DOM-owe (onFrame/onEnd/onShatter) ale particles ŻYJĄ dalej na canvasie */
  detachGroup: (id: string) => void;
  /** Pauzuje animację grupy — zachowuje elapsed żeby wznowienie startGroup() kontynuowało od miejsca pauzy */
  stopGroup: (id: string) => void;
  /** Podmienia sourceImg grupy (np. po refreshSnapshot) */
  updateGroupSource: (id: string, sourceImg: HTMLCanvasElement) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ParticlesContext = createContext<ParticlesContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ParticlesProviderProps {
  /** Docelowe FPS animacji – ustalane raz przy montowaniu */
  fps: number;
  children: React.ReactNode;
}

export function ParticlesProvider({ fps, children }: ParticlesProviderProps) {
  const groupsRef = useRef<Map<string, ParticleGroup>>(new Map());

  // Trzymamy rozmiar okna w refie — bez re-renderów przy resize (jak w Vaporize)
  // Inicjalizujemy 0, żeby uniknąć różnic między SSR a nawodnieniem (hydration)
  const windowSizeRef = useRef({
    width: 0,
    height: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  // null = pierwsza klatka jeszcze nie była — unika spike'a deltaTime przy starcie (jak w Vaporize)
  const lastFrameTimeRef = useRef<number | null>(null);
  const frameInterval = 1000 / fps;

  const [currentFps, setCurrentFps] = useState(0);

  // ── Operacje na grupach ──────────────────────────────────────────────────

  const addGroup = useCallback((group: ParticleGroup) => {
    // Atomowo — usuń starą jeśli istnieje, wstaw nową
    groupsRef.current.delete(group.id);
    groupsRef.current.set(group.id, group);
  }, []);

  const removeGroup = useCallback((id: string) => {
    groupsRef.current.delete(id);
  }, []);

  const startGroup = useCallback((id: string) => {
    const group = groupsRef.current.get(id);
    if (!group) return;
    // Odejmujemy zakumulowany elapsed — cząsteczki kontynuują od miejsca pauzy
    groupsRef.current.set(id, {
      ...group,
      isRunning: true,
      startTime: performance.now() - group.accumulatedElapsed,
      accumulatedElapsed: 0,
    });
  }, []);

  const stopGroup = useCallback((id: string) => {
    const group = groupsRef.current.get(id);
    if (!group || !group.isRunning) return;
    groupsRef.current.set(id, {
      ...group,
      isRunning: false,
      accumulatedElapsed: performance.now() - group.startTime,
    });
  }, []);

  const updateGroupSource = useCallback((id: string, sourceImg: HTMLCanvasElement) => {
    const group = groupsRef.current.get(id);
    if (!group) return;
    groupsRef.current.set(id, { ...group, sourceImg });
  }, []);

  const detachGroup = useCallback((id: string) => {
    const group = groupsRef.current.get(id);
    if (!group) return;
    // Czyścimy callbacki dotykające DOM konsumenta — cząsteczki zostają
    groupsRef.current.set(id, {
      ...group,
      onFrame: undefined,
      onEnd: undefined,
      onShatter: undefined,
      shatterCalled: true, // nie wywołuj onShatter na odmontowanym DOM
    });
  }, []);

  // ── Canvas resize ────────────────────────────────────────────────────────

  useEffect(() => {
    // Inicjalizujemy rozmiar po zamontowaniu (na kliencie)
    windowSizeRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }

    // Debounce 100ms — jak w Vaporize, unika niepotrzebnych przerysowań podczas przeciągania okna
    let timeoutId: number;
    function handleResize() {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        windowSizeRef.current = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = windowSizeRef.current.width;
          canvas.height = windowSizeRef.current.height;
        }
      }, 100);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // ── Pętla animacji ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let fpsFrames = 0;
    let fpsAccum = 0;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);

      // Pierwsza klatka — inicjalizuj czas i poczekaj na następną (jak w Vaporize)
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = timestamp - lastFrameTimeRef.current;
      if (delta < frameInterval) return;

      // Zużyj tylko wielokrotność interwału — reszta przechodzi do następnej klatki
      lastFrameTimeRef.current = timestamp - (delta % frameInterval);

      const deltaTimeSec = delta / 1000;

      // Pomiar FPS
      fpsFrames++;
      fpsAccum += delta;
      if (fpsAccum >= 1000) {
        setCurrentFps(fpsFrames);
        fpsFrames = 0;
        fpsAccum = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Iteruj po grupach
      for (const [id, group] of groupsRef.current) {
        // Pauza — rysuj żywe cząsteczki bez aktualizacji fizyki
        if (!group.isRunning) {
          for (const p of group.particles) {
            if (!p.particleLife.hasSpawned || p.particleLife.isDead) continue;
            if (p.particleStyle.opacity <= 0.01) continue;
            ctx.globalAlpha = p.particleStyle.opacity;
            ctx.drawImage(
              group.sourceImg,
              p.particleStyle.sprite.sourceX,
              p.particleStyle.sprite.sourceY,
              p.width,
              p.height,
              p.x,
              p.y,
              p.width,
              p.height,
            );
          }
          ctx.globalAlpha = 1;
          continue;
        }

        // elapsedTime w sekundach — worker generuje spawnTime/lifetime w sekundach
        const elapsedTime = (timestamp - group.startTime) / 1000;
        let allDead = true;

        for (const p of group.particles) {
          // Spawn check
          if (!p.particleLife.hasSpawned) {
            if (elapsedTime >= p.particleLife.spawnTime) {
              p.particleLife.hasSpawned = true;
            } else {
              allDead = false;
              continue;
            }
          }

          if (p.particleLife.isDead) continue;

          // Aktualizuj fizykę cząsteczki
          group.updatePhysics(p, deltaTimeSec);

          // Aktualizuj wiek (sekundy — spójnie z lifetime z workera)
          p.particleLife.age += deltaTimeSec;
          if (p.particleLife.age >= p.particleLife.lifetime) {
            p.particleLife.isDead = true;
            continue;
          }

          allDead = false;

          // Rysuj
          if (p.particleStyle.opacity <= 0.01) continue;
          ctx.globalAlpha = p.particleStyle.opacity;
          ctx.drawImage(
            group.sourceImg,
            p.particleStyle.sprite.sourceX,
            p.particleStyle.sprite.sourceY,
            p.width,
            p.height,
            p.x,
            p.y,
            p.width,
            p.height,
          );
        }

        ctx.globalAlpha = 1;

        // Shatter — wszystkie cząsteczki się spawną = element w pełni rozbity
        if (!group.shatterCalled && group.particles.every(p => p.particleLife.hasSpawned)) {
          group.shatterCalled = true;
          group.onShatter?.();
        }

        // Callback per-frame (synchronizacja maski CSS) — ta sama klatka
        group.onFrame?.(group.particles, elapsedTime);

        // Autodeath — wszystkie cząsteczki martwe
        if (allDead) {
          group.onEnd?.();
          groupsRef.current.delete(id);
        }
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastFrameTimeRef.current = null;
    };
  }, [frameInterval]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ParticlesContext.Provider
      value={{ fps: currentFps, addGroup, removeGroup, startGroup, stopGroup, detachGroup, updateGroupSource }}
    >
      {/* width/height jako atrybuty HTML — rozmiar bufora pikseli. CSS 100vw/100vh = skalowanie wyświetlania */}
      <canvas
        ref={canvasRef}
        width={windowSizeRef.current.width}
        height={windowSizeRef.current.height}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
      {children}
    </ParticlesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useParticles() {
  const ctx = useContext(ParticlesContext);
  if (!ctx) {
    throw new Error("useParticles must be used within <ParticlesProvider>");
  }
  return ctx;
}