import { useState, useRef } from "react";
import { type VaporizeRef, Vaporize } from "./Vaporize";

import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import { DevTools } from "./DevTools";
import type { VaporizeConfig } from "./types";


//Dodanie propsów żeby można było zmienić szybko zwykły komponent na dev i się nie jebać
interface VaporizeProps {
    children: React.ReactNode;

    config?: Partial<VaporizeConfig>;

    onStart?: () => void;
    onShatterFinished?: () => void; // wywoływane, gdy orginalny komponent będzie w pełni rozbity na cząsteczki
    onEnd?: () => void;
    onReset?: () => void;

    timeMaskGenerator?: keyof typeof MasksGenerators; // klucz generatora maski z obiektu MasksGenerators
    particleInitialState?: keyof typeof ParticleInitialStates; // klucz stanu początkowego z obiektu ParticleInitialStates
    particleEffect?: keyof typeof ParticleEffects; // klucz efektu cząsteczek z obiektu ParticleEffects
}

export function VaporizeDev({
    children, 
    timeMaskGenerator: initialTimeMaskGenerator = "topLeftDiagonal",
    particleInitialState: initialParticleInitialState = "explosion",
    particleEffect: initialParticleEffect = "gravitationBottom",
    config: initialConfig,
    onStart = () => { },
    onShatterFinished = () => { },
    onEnd = () => { },
    onReset = () => { },
}: VaporizeProps) {
    const [config, setConfig] = useState({
        fps: initialConfig?.fps ?? 120,
        maxParticles: initialConfig?.maxParticles ?? 2000,
    });
    const [timeMaskGenerator, setTimeMaskGenerator] = useState<keyof typeof MasksGenerators>( initialTimeMaskGenerator);
    const [particleInitialState, setParticleInitialState] = useState<keyof typeof ParticleInitialStates>(initialParticleInitialState);
    const [particleEffect, setParticleEffect] = useState<keyof typeof ParticleEffects>(initialParticleEffect);
    

    const VaporizeRef = useRef<VaporizeRef>(null);
        const VaporizeInstanceKey = [
            timeMaskGenerator,
            particleInitialState,
            config.maxParticles,
        ].join(":");


    return (
        <>
            <DevTools
                config={config}
                reset={() => VaporizeRef.current?.reset()}
                start={() => VaporizeRef.current?.start()}
                stop={() => VaporizeRef.current?.stop()}

                timeMaskGenerator={timeMaskGenerator}
                particleInitialState={particleInitialState}
                particleEffect={particleEffect}

                setConfig={setConfig}
                setTimeMaskGenerator={setTimeMaskGenerator}
                setParticleInitialState={setParticleInitialState}
                setParticleEffect={setParticleEffect}
            />
            <Vaporize 
                key={VaporizeInstanceKey}
                ref={VaporizeRef}
                config={config}
                particleInitialState={particleInitialState}
                particleEffect={particleEffect}
                timeMaskGenerator={timeMaskGenerator}
                onStart={onStart}
                onShatterFinished={onShatterFinished}
                onEnd={onEnd}
                onReset={onReset}
            >
                {children}
            </Vaporize>
        </>
    )
}