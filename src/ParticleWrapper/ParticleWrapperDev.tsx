import { useState, useRef } from "react";
import ParticleWrapper, { type ParticleWrapperRef } from "./ParticleWrapper";

import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import { DevTools } from "./DevTools";

export function ParticleWrapperDev({children}: {children: React.ReactNode}) {
    const [config, setConfig] = useState({
        fps: 120,
        maxParticles: 2000,
    });
    const [timeMaskGenerator, setTimeMaskGenerator] = useState<keyof typeof MasksGenerators>("topLeftDiagonal");
    const [particleInitialState, setParticleInitialState] = useState<keyof typeof ParticleInitialStates>("explosion");
    const [particleEffect, setParticleEffect] = useState<keyof typeof ParticleEffects>("gravitationBottom");
    

    const particleWrapperRef = useRef<ParticleWrapperRef>(null);


    return (
        <>
            <DevTools
                config={config}
                reset={() => particleWrapperRef.current?.reset()}
                start={() => particleWrapperRef.current?.start()}
                stop={() => particleWrapperRef.current?.stop()}
                hardReset={() => particleWrapperRef.current?.hardReset()}

                timeMaskGenerator={timeMaskGenerator}
                particleInitialState={particleInitialState}
                particleEffect={particleEffect}

                setConfig={setConfig}
                setTimeMaskGenerator={setTimeMaskGenerator}
                setParticleInitialState={setParticleInitialState}
                setParticleEffect={setParticleEffect}
            />
            <ParticleWrapper 
                ref={particleWrapperRef}
                config={config}
                particleInitialState={particleInitialState}
                particleEffect={particleEffect}
                timeMaskGenerator={timeMaskGenerator}
            >
                {children}
            </ParticleWrapper>
        </>
    )
}