import type { Particle } from "./types";

export const createBlowDownEffect = (speed: number = 150) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityY = speed;
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        // Płynne zanikanie
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createBlowUpEffect = (speed: number = 150) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityY = -speed;
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createGravitationBottomEffect = (gravity: number = 400) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityY += gravity * deltaTime; // Acceleration
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.5);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createGravitationUpEffect = (gravity: number = 400) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityY -= gravity * deltaTime; // Negative acceleration (upwards)
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.5);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createWavyFloatingEffect = (frequency: number = 5, amplitude: number = 100) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityX += Math.sin(p.particleLife.age * frequency) * amplitude * deltaTime;
        p.particlePhysics.velocityY -= 50 * deltaTime; // slight constant float up
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.4);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createFlickerFadeEffect = () => {
    return (p: Particle, deltaTime: number): void => {
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        // Randomly flicker opacity while fading out generally
        const flicker = Math.random() > 0.8 ? 0.3 : 0;
        const mainFade = p.particleStyle.opacity - deltaTime * 0.8;
        p.particleStyle.opacity = Math.max(0, mainFade - flicker);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createWindyGravityEffect = (wind: number = 200, gravity: number = 300) => {
    return (p: Particle, deltaTime: number): void => {
        p.particlePhysics.velocityX += wind * deltaTime;
        p.particlePhysics.velocityY += gravity * deltaTime;
        
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.6);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createSwirlEffect = (rotationSpeed: number = 3) => {
    return (p: Particle, deltaTime: number): void => {
        // Apply angular rotation to the velocity vector
        const cos = Math.cos(rotationSpeed * deltaTime);
        const sin = Math.sin(rotationSpeed * deltaTime);
        const vx = p.particlePhysics.velocityX;
        const vy = p.particlePhysics.velocityY;
        
        p.particlePhysics.velocityX = vx * cos - vy * sin;
        p.particlePhysics.velocityY = vx * sin + vy * cos;
        
        // Expand outwards slowly
        p.particlePhysics.velocityX *= 1.01;
        p.particlePhysics.velocityY *= 1.01;

        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        p.particleStyle.opacity = Math.max(0, p.particleStyle.opacity - deltaTime * 0.5);
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const createShrinkFadeEffect = () => {
    return (p: Particle, deltaTime: number): void => {
        p.x += p.particlePhysics.velocityX * deltaTime;
        p.y += p.particlePhysics.velocityY * deltaTime;
        
        // Cząsteczka zmniejsza się przy znikaniu (choć scale nie ma w typie, zrobimy szybkie zniknięcie)
        p.particleStyle.opacity -= deltaTime * 1.5;
        p.particleLife.isDead = p.particleStyle.opacity <= 0;
    };
};

export const ParticleEffects = {
    blowDown: createBlowDownEffect(),
    blowUp: createBlowUpEffect(),
    gravitationBottom: createGravitationBottomEffect(),
    gravitationUp: createGravitationUpEffect(),
    wavyFloating: createWavyFloatingEffect(),
    flickerFade: createFlickerFadeEffect(),
    windyGravity: createWindyGravityEffect(),
    swirl: createSwirlEffect(),
    shrinkFade: createShrinkFadeEffect(),
};
