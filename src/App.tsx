import { useRef, useCallback } from 'react'
import { type Particle, ParticleWrapper, type ParticleWrapperRef } from './ParticleWrapper'

export function App() {
  const particleWrapperRef = useRef<ParticleWrapperRef>(null)

  const applyParticleEffect = useCallback((particle: Particle, deltaTime: number): Particle => {
    // Płynny ruch wynikający z prędkości, brak losowego trzęsienia
    particle.x += particle.particlePhysics.velocityX * deltaTime
    particle.y += particle.particlePhysics.velocityY * deltaTime

    // Przyspieszenie (grawitacja i ewentualny opór powietrza dla płynności)
    const airResistance = 0.98; // Tłumi prędkość cząsteczek z czasem, by nie leciały w nieskończoność z taką samą siłą
    particle.particlePhysics.velocityX *= airResistance;
    particle.particlePhysics.velocityY *= airResistance;

    // Aplikowanie grawitacji
    particle.particlePhysics.velocityX += particle.particlePhysics.accelerationX * deltaTime
    particle.particlePhysics.velocityY += particle.particlePhysics.accelerationY * deltaTime

    // Rotacja poprzez nieznaczną modyfikację alpha / zanikanie wraz z upływem życia
    particle.particleStyle.opacity = Math.max(0, particle.particleLife.lifetime / 3);

    particle.particleLife.lifetime -= deltaTime

    if (particle.particleLife.lifetime <= 0) {
      particle.particleLife.isDead = true
    }

    return particle
  }, [])

  const particleInitialState = useCallback((particle: Particle): Particle => {
    // Losowy kąt i kierunek eksplozji – bardziej sferyczny i naturalny rozpad
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 200 + 50;

    return {
      ...particle,
      particlePhysics: {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 150, // Dodatkowy "kop" w górę przy starcie
        accelerationX: 0,
        accelerationY: 400, // Silniejsza grawitacja ściągająca cząsteczki płynnie w dół po łuku
      },
      particleLife: {
        spawnTime: particle.particleLife.spawnTime,
        age: 0,
        lifetime: 1.5 + Math.random() * 1.5, // Krótszy, ale bardziej jednolity żywot
        isDead: false,
      },
    }
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', height: '100vh', backgroundColor: '#f7f9fc' }}>
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
        config={{
          fps: 120,
          maxParticles: 1000,
        }}
        particleInitialState={particleInitialState}
        particleEffect={applyParticleEffect}
        ref={particleWrapperRef}
      >
        <div
          onClick={() => particleWrapperRef.current?.start()}
          style={{
            width: '450px',
            height: '500px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            border: '1px solid #eaeaea',
          }}
        >
          {/* Avatar Placeholder */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
              marginBottom: '20px',
              boxShadow: '0 8px 16px rgba(161, 140, 209, 0.3)'
            }}
          />
          
          {/* User Info */}
          <h2 style={{ margin: '0 0 8px 0', color: '#222', fontSize: '26px', fontWeight: '700' }}>
            John Doe
          </h2>
          <p style={{ margin: '0 0 32px 0', color: '#888', fontSize: '15px', fontWeight: '400' }}>
            UI/UX Designer & Developer
          </p>

          {/* Stats Segment */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: 'auto', padding: '0 20px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '22px', color: '#333' }}>48</span>
              <span style={{ color: '#aaa', fontSize: '13px', paddingTop: '4px' }}>PROJEKTY</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '22px', color: '#333' }}>12.4k</span>
              <span style={{ color: '#aaa', fontSize: '13px', paddingTop: '4px' }}>OBSERWUJĄCY</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '22px', color: '#333' }}>324</span>
              <span style={{ color: '#aaa', fontSize: '13px', paddingTop: '4px' }}>OBSERWACJE</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            style={{
              marginTop: '32px',
              padding: '14px 0',
              width: '100%',
              backgroundColor: '#1E1E1E',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            Obserwuj
          </button>
        </div>
      </ParticleWrapper>
    </div>
  )
}