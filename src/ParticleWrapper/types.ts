export interface ParticleWrapperConfig {
    maxParticles: number; // Maksymalna liczba cząsteczek, które mogą istnieć jednocześnie
    fps: number; // Docelowa liczba klatek na sekundę dla animacji cząsteczek
}

export interface ParticlePhysics {
    velocityX: number;
    velocityY: number;
    accelerationX: number;
    accelerationY: number;
}

export interface ParticleStyle {
    opacity: number; // Przezroczystość cząsteczki (0-1)
    
    // sprite - źródło do rysowania cząsteczki, czyli fragment orginalnego children
    sprite: {
        sourceX: number;
        sourceY: number;
    }
}

export interface ParticleLife {
    spawnTime: number; // Czas, w którym cząsteczka zostanie stworzona
    age: number; // czas życia cząsteczki
    lifetime: number; // maksymalny czas życia cząsteczki
    isDead: boolean; // czy cząsteczka jest martwa
}

export interface Particle {
    id: string;

    originX: number; // Początkowa pozycja X cząsteczki względem ekranu i children
    originY: number; // Początkowa pozycja Y cząsteczki względem ekranu i children

    x: number; // Aktualna pozycja X cząsteczki względem ekranu
    y: number; // Aktualna pozycja Y cząsteczki względem ekranu

    width: number; // Szerokość cząsteczki
    height: number; // Wysokość cząsteczki

    particlePhysics: ParticlePhysics; // Właściwości fizyczne cząsteczki (prędkość, przyspieszenie, itp.)
    particleStyle: ParticleStyle; // Właściwości stylu cząsteczki (przezroczystość, sprite, itp.)
    particleLife: ParticleLife; // Właściwości życia cząsteczki (wiek, czas życia, itp.)
}

export type ParticleEffect = (particle: Particle, deltaTime: number) => void;
export type ParticleInitialState = (particle: Particle) => void;
export type TimeMaskGenerator = (width: number, height: number) => { mask: number[][], timeArray: number[] };