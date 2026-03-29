import { useRef, useCallback } from 'react'
import { type Particle, ParticleWrapper, type ParticleWrapperRef } from './ParticleWrapper'

const buttonColor = '#30A2F9'

export function App() {
  const particleWrapperRef = useRef<ParticleWrapperRef>(null)

  const applyParticleEffect = useCallback((particle: Particle, deltaTime: number): Particle | null => {
    return particle;
    const newX = particle.x + particle.particlePhysics.velocityX * deltaTime + (Math.random() - 0.5) * 5
    const newY = particle.y + particle.particlePhysics.velocityY * deltaTime + (Math.random() - 0.5) * 2

    const newVelocityX = particle.particlePhysics.velocityX + particle.particlePhysics.accelerationX * deltaTime
    const newVelocityY = particle.particlePhysics.velocityY + particle.particlePhysics.accelerationY * deltaTime

    const newLifetime = particle.particleLife.lifetime - deltaTime

    if (newLifetime <= 0) {
      return null
    }

    return {
      ...particle,
      x: newX,
      y: newY,
      particlePhysics: {
        ...particle.particlePhysics,
        velocityX: newVelocityX,
        velocityY: newVelocityY,
      },
      particleLife: {
        ...particle.particleLife,
        lifetime: newLifetime,
      },
    }
  }, [])

  const particleInitialState = useCallback((particle: Particle): Particle => {
    return {
      ...particle,
      particlePhysics: {
        velocityX: (Math.random() - 0.5) * 100,
        velocityY: (Math.random() - 0.5) * 100,
        accelerationX: 0,
        accelerationY: 100,
      },
      particleLife: {
        age: 0,
        lifetime: 2 + Math.random() * 3,
        isDead: false,
      },
    }
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', height: '100vh' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <button onClick={() => particleWrapperRef.current?.reset()} style={{ width: '100px', height: '50px' }}>
          Resetuj
        </button>
        <button onClick={() => particleWrapperRef.current?.start()} style={{ width: '100px', height: '50px' }}>
          Start
        </button>
        <button onClick={() => particleWrapperRef.current?.stop()} style={{ width: '100px', height: '50px' }}>
          Stop
        </button>
      </div>

      <ParticleWrapper
        particleInitialState={particleInitialState}
        particleEffect={applyParticleEffect}
        ref={particleWrapperRef}
      >
        <button
          onClick={() => particleWrapperRef.current?.start()}
          style={{
            width: '100px',
            height: '50px',
            backgroundColor: buttonColor,
            border: 'none',
            borderRadius: '40px',
            justifyContent: 'center',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Kliknij mnie!
        </button>
      </ParticleWrapper>
    </div>
  )
}