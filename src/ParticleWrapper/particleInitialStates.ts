import type { Particle } from "./types";

export const createExplosionInitialState = (force: number = 200) => {
    return (p: Particle): void => {
        // Random direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * force;
        
        p.particlePhysics.velocityX = Math.cos(angle) * speed;
        p.particlePhysics.velocityY = Math.sin(angle) * speed;
    };
};

export const createScatterInitialState = (horizontalSpread: number = 100, verticalForce: number = 150) => {
    return (p: Particle): void => {
        // Scatter mostly upwards and to the sides
        p.particlePhysics.velocityX = (Math.random() - 0.5) * horizontalSpread;
        p.particlePhysics.velocityY = -Math.random() * verticalForce - 50; 
    };
};

export const createFreefallInitialState = () => {
    return (p: Particle): void => {
        // No initial velocity, just starts falling
        p.particlePhysics.velocityX = (Math.random() - 0.5) * 10; // slightly random X
        p.particlePhysics.velocityY = 0;
    };
};

export const createFountainInitialState = (force: number = 300) => {
    return (p: Particle): void => {
        p.particlePhysics.velocityX = (Math.random() - 0.5) * force * 0.5;
        p.particlePhysics.velocityY = -Math.random() * force - force * 0.5;
    };
};

export const createImplosionInitialState = (speed: number = 200) => {
    return (p: Particle): void => {
        const angle = Math.random() * Math.PI * 2;
        p.particlePhysics.velocityX = -Math.cos(angle) * speed;
        p.particlePhysics.velocityY = -Math.sin(angle) * speed;
    };
};

export const createVortexInitialState = (speed: number = 150) => {
    return (p: Particle): void => {
        const angle = Math.random() * Math.PI * 2;
        // Tangent velocity for a circular motion
        p.particlePhysics.velocityX = Math.sin(angle) * speed;
        p.particlePhysics.velocityY = -Math.cos(angle) * speed;
    };
};

export const createRaindropInitialState = (baseSpeed: number = 100) => {
    return (p: Particle): void => {
        p.particlePhysics.velocityX = (Math.random() - 0.5) * 20;
        p.particlePhysics.velocityY = baseSpeed + Math.random() * baseSpeed;
    };
};

export const createDriftInitialState = (maxSpeed: number = 30) => {
    return (p: Particle): void => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * maxSpeed;
        p.particlePhysics.velocityX = Math.cos(angle) * speed;
        p.particlePhysics.velocityY = Math.sin(angle) * speed;
    };
};

export const ParticleInitialStates = {
    explosion: createExplosionInitialState(),
    scatter: createScatterInitialState(),
    freefall: createFreefallInitialState(),
    fountain: createFountainInitialState(),
    implosion: createImplosionInitialState(),
    vortex: createVortexInitialState(),
    raindrop: createRaindropInitialState(),
    drift: createDriftInitialState(),
};