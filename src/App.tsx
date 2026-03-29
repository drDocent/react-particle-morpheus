import { useRef, useCallback, useState } from 'react'
import { type Particle, ParticleWrapper, type ParticleWrapperRef, diagonalMask, leftToRightMask, rightToLeftMask, topToBottomMask, bottomToTopMask, sandMask, type TimeMaskGenerator } from './ParticleWrapper'
import { Trash } from 'lucide-react'

export function App() {
  const particleWrapperRef = useRef<ParticleWrapperRef>(null)
  const particleWrapper2Ref = useRef<ParticleWrapperRef>(null)
  const [maskKey, setMaskKey] = useState<string>('diagonal');
  const [isHovered, setIsHovered] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const masks: Record<string, TimeMaskGenerator> = {
    diagonal: diagonalMask,
    leftToRight: leftToRightMask,
    rightToLeft: rightToLeftMask,
    topToBottom: topToBottomMask,
    bottomToTop: bottomToTopMask,
    sand: sandMask
  };

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
    <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'row', alignItems: 'center', height: '100vh', backgroundColor: '#f7f9fc', gap: '100px' }}>
      
      {/* Kolumna 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            maxParticles: 2000,
          }}
          particleInitialState={particleInitialState}
          particleEffect={applyParticleEffect}
          timeMaskGenerator={diagonalMask}
          ref={particleWrapperRef}
        >
          <div
            style={{
            position: 'relative',
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
            fontFamily: 'sans-serif',
            border: '1px solid #eaeaea',
          }}
        >
          {/* Trash Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              particleWrapperRef.current?.start();
            }}
            title="Usuń kartę"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#aaa',
              transition: 'color 0.2s, transform 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff4d4f';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#aaa';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Trash />
          </button>

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

          {/* Interactive Input */}
          <input
            onClick={(e) => e.stopPropagation()}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = '#a18cd1'}
            onBlur={(e) => e.target.style.borderColor = '#eaeaea'}
            placeholder="Napisz do mnie wiadomość..."
            style={{
              marginTop: '24px',
              padding: '12px 16px',
              width: '100%',
              borderRadius: '8px',
              border: '2px solid #eaeaea',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
          />

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(inputValue ? `Wysłano wiadomość: ${inputValue}` : 'Zaobserwowałeś Johna!');
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              marginTop: '16px',
              padding: '14px 0',
              width: '100%',
              backgroundColor: isHovered ? '#333333' : '#1E1E1E',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {inputValue ? 'Wyślij wiadomość' : 'Obserwuj'}
          </button>
        </div>
      </ParticleWrapper>
      </div>

      {/* Kolumna 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <button onClick={() => particleWrapper2Ref.current?.reset()} style={{ width: '100px', height: '50px' }}>
            Resetuj 2
          </button>
          <button onClick={() => particleWrapper2Ref.current?.start()} style={{ width: '100px', height: '50px' }}>
            Start 2
          </button>
          <button onClick={() => particleWrapper2Ref.current?.stop()} style={{ width: '100px', height: '50px' }}>
            Stop 2
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', maxWidth: '300px', justifyContent: 'center' }}>
          <button onClick={() => { setMaskKey('diagonal'); particleWrapper2Ref.current?.hardReset(); }}>Ukośnie</button>
          <button onClick={() => { setMaskKey('leftToRight'); particleWrapper2Ref.current?.hardReset(); }}>L -{'>'} P</button>
          <button onClick={() => { setMaskKey('rightToLeft'); particleWrapper2Ref.current?.hardReset(); }}>P -{'>'} L</button>
          <button onClick={() => { setMaskKey('topToBottom'); particleWrapper2Ref.current?.hardReset(); }}>Góra -{'>'} Dół</button>
          <button onClick={() => { setMaskKey('bottomToTop'); particleWrapper2Ref.current?.hardReset(); }}>Dół -{'>'} Góra</button>
          <button onClick={() => { setMaskKey('sand'); particleWrapper2Ref.current?.hardReset(); }}>Piasek</button>
        </div>

        <ParticleWrapper
          config={{
            fps: 120,
            maxParticles: 1000,
          }}
          particleInitialState={particleInitialState}
          particleEffect={applyParticleEffect}
          ref={particleWrapper2Ref}
          timeMaskGenerator={masks[maskKey]}
        >
          <button
            onClick={() => particleWrapper2Ref.current?.start()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#41B0FF',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '16px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Kliknij mnie!
          </button>
        </ParticleWrapper>
      </div>
     
    </div>
  )
}