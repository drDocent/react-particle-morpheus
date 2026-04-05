import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Particle } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParticleGroup {
  id: string;            // generowane przez konsumenta: crypto.randomUUID()
  isRunning: boolean;
  particles: Particle[];
  particleEffect: string;
  startTime: number;
  sourceImg: HTMLCanvasElement | HTMLImageElement | ImageBitmap;

  onEnd: () => void;
  onShatter: () => void;
}

interface ParticlesContextType {
  /** Aktualnie mierzone FPS pętli animacji */
  fps: number;

  /** Dodaje grupę; id musi być unikalne i wygenerowane przez konsumenta */
  addGroup: (group: ParticleGroup) => void;
  /** Usuwa grupę po id */
  removeGroup: (id: string) => void;
  /** Ustawia isRunning: true i zapisuje startTime dla danej grupy */
  startGroup: (id: string) => void;
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
  // Grupy trzymane w Map (O(1) lookup po id) w refie — nie powodują re-renderów
  const groupsRef = useRef<Map<string, ParticleGroup>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameInterval = 1000 / fps;

  const [currentFps, setCurrentFps] = useState(0);

  // ── Operacje na grupach ──────────────────────────────────────────────────

  const addGroup = useCallback((group: ParticleGroup) => {
    groupsRef.current.set(group.id, group);
  }, []);

  const removeGroup = useCallback((id: string) => {
    groupsRef.current.delete(id);
  }, []);

  const startGroup = useCallback((id: string) => {
    const group = groupsRef.current.get(id);
    if (!group) return;
    groupsRef.current.set(id, {
      ...group,
      isRunning: true,
      startTime: performance.now(),
    });
  }, []);

  // ── Canvas resize ────────────────────────────────────────────────────────

  useEffect(() => {
    const sync = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
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

      const delta = timestamp - lastTimeRef.current;
      if (delta < frameInterval) return;
      lastTimeRef.current = timestamp - (delta % frameInterval);

      // Pomiar FPS
      fpsFrames++;
      fpsAccum += delta;
      if (fpsAccum >= 1000) {
        setCurrentFps(fpsFrames);
        fpsFrames = 0;
        fpsAccum = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rysuj cząsteczki ze wszystkich aktywnych grup
      for (const group of groupsRef.current.values()) {
        if (!group.isRunning) continue;

        for (const p of group.particles) {
          if (!p.particleLife.hasSpawned || p.particleLife.isDead) continue;

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
      }

      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frameInterval]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ParticlesContext.Provider
      value={{ fps: currentFps, addGroup, removeGroup, startGroup }}
    >
      {/* Globalny canvas — fixed overlay, nie blokuje zdarzeń myszy */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
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