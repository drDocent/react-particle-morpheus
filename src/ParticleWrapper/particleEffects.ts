import type { Particle } from "./types";

export const createBlowDownEffect = (speed: number = 150) => {
    return (particle: Particle, deltaTime: number): Particle => {
        const p = { ...particle };
        p.particlePhysics.velocityY = speed;
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        // Płynne zanikanie
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
        
        return p;
    };
};

export const createBlowUpEffect = (speed: number = 150) => {
    return (particle: Particle, deltaTime: number): Particle => {
        const p = { ...particle };
        p.particlePhysics.velocityY = -speed;
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
        
        return p;
    };
};

export const createGravitationBottomEffect = (gravity: number = 400) => {
    return (particle: Particle, deltaTime: number): Particle => {
        const p = { ...particle };
        p.particlePhysics.velocityY += gravity * deltaTime; // Acceleration
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.5);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
        
        return p;
    };
};

export const createGravitationUpEffect = (gravity: number = 400) => {
    return (particle: Particle, deltaTime: number): Particle => {
        const p = { ...particle };
        p.particlePhysics.velocityY -= gravity * deltaTime; // Negative acceleration (upwards)
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.5);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
        
        return p;
    };
};

export const ParticleEffects = {
    blowDown: createBlowDownEffect(),
    blowUp: createBlowUpEffect(),
    gravitationBottom: createGravitationBottomEffect(),
    gravitationUp: createGravitationUpEffect(),
};
