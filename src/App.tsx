import { useState, useRef} from 'react'
import { type Particle, ParticleWrapper, type ParticleWrapperRef } from './ParticleWrapper'

const buttonColor = '#30A2F9'

export function App(){
  const [showButton, setShowButton] = useState<boolean>(true)

  const particleWrapperRef = useRef<ParticleWrapperRef>(null)

  function applyParticeleEffect(particle: Particle, deltaTime: number){
    const newOffsetX = particle.offsetX + particle.velocityX * deltaTime + (Math.random()-0.5) * 5
    const newOffsetY = particle.offsetY + particle.velocityY * deltaTime + (Math.random() -0.5) *2

    const newVelocityX = particle.velocityX + particle.accelerationX * deltaTime
    const newVelocityY = particle.velocityY + particle.accelerationY * deltaTime

    const newLifetime = particle.lifetime !== undefined ? particle.lifetime - deltaTime : undefined

    if(newLifetime !== undefined && newLifetime <= 0){
      return null
    }

    return {
      ...particle,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      velocityX: newVelocityX,
      velocityY: newVelocityY,
      lifetime: newLifetime,
    }
  }

  return (
    <div style={{display: 'flex', justifyContent: 'center', flexDirection: "column", alignItems: 'center', height: '100vh'}}>
      <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
        <button onClick={() => {particleWrapperRef.current?.reset(); setShowButton(true)}} style={{width: '100px', height: '50px'}}>
          Resetuj
        </button>
      </div>
      <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
        <button onClick={() => {particleWrapperRef.current?.start(); setShowButton(false)}} style={{width: '100px', height: '50px'}}>
          Start
        </button>
        <button onClick={() => {particleWrapperRef.current?.stop()}} style={{width: '100px', height: '50px'}}>
          Stop
        </button>
      </div>

      <ParticleWrapper applyParticeleEffect={applyParticeleEffect} ref={particleWrapperRef}>
        <button onClick={() => {setShowButton(false); particleWrapperRef.current?.start()}} style={{width: '100px', height: '50px', backgroundColor: showButton ? buttonColor : 'transparent', border: 'none', borderRadius: '40px'}} > <p style={{backgroundColor: 'red', color: 'violet'}}>TEST</p> </button>
      </ParticleWrapper>
    </div>
  )
}