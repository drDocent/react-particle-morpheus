import type { Particle } from "./types";

export const createExplosionInitialState = (force: number = 200) => {
    return (particle: Particle): Particle => {
        const p = { ...particle };
        // Random direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * force;
        
        p.particlePhysics.velocityX = Math.cos(angle) * speed;
        p.particlePhysics.velocityY = Math.sin(angle) * speed;
        
        return p;
    };
};

export const createScatterInitialState = (horizontalSpread: number = 100, verticalForce: number = 150) => {
    return (particle: Particle): Particle => {
        const p = { ...particle };
        // Scatter mostly upwards and to the sides
        p.particlePhysics.velocityX = (Math.random() - 0.5) * horizontalSpread;
        p.particlePhysics.velocityY = -Math.random() * verticalForce - 50; 
        
        return p;
    };
};

export const createFreefallInitialState = () => {
    return (particle: Particle): Particle => {
        const p = { ...particle };
        // No initial velocity, just starts falling
        p.particlePhysics.velocityX = (Math.random() - 0.5) * 10; // slightly random X
        p.particlePhysics.velocityY = 0;
        
        return p;
    };
};


export const ParticleInitialStates = {
    explosion: createExplosionInitialState(),
    scatter: createScatterInitialState(),
    freefall: createFreefallInitialState(),
};