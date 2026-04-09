import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Vaporize } from "./Vaporize";

import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import { DevTools } from "./DevTools";
import type { VaporizeProps, VaporizeRef } from "./Vaporize";

//Dodanie propsów żeby można było zmienić szybko zwykły komponent na dev i się nie jebać
interface VaporizeDevProps extends Partial<VaporizeProps> {
    children: React.ReactNode;
}

export const VaporizeDev = forwardRef<VaporizeRef, VaporizeDevProps>(function VaporizeDev({
    children,
    timeMaskGenerator: initialTimeMaskGenerator = "topLeftDiagonal",
    particleInitialState: initialParticleInitialState = "explosion",
    particleEffect: initialParticleEffect = "gravitationBottom",
    config: initialConfig,
    onStart = () => { },
    onShatterFinished = () => { },
    onEnd = () => { },
    onReset = () => { },
}, ref) {
    const [config, setConfig] = useState({
        maxParticles: initialConfig?.maxParticles ?? 2000,
        autoInitialize: initialConfig?.autoInitialize ?? true,
        showLogs: initialConfig?.showLogs ?? false,
    });
    const [timeMaskGenerator, setTimeMaskGenerator] = useState<keyof typeof MasksGenerators>( initialTimeMaskGenerator);
    const [particleInitialState, setParticleInitialState] = useState<keyof typeof ParticleInitialStates>(initialParticleInitialState);
    const [particleEffect, setParticleEffect] = useState<keyof typeof ParticleEffects>(initialParticleEffect);
    

    const VaporizeRef = useRef<VaporizeRef>(null);

    useImperativeHandle(ref, () => ({
        start: () => { VaporizeRef.current?.start(); },
        stop: () => { VaporizeRef.current?.stop(); },
        reset: () => { VaporizeRef.current?.reset(); },
        resetAll: () => { VaporizeRef.current?.resetAll(); },
        refreshSnapshot: () => { VaporizeRef.current?.refreshSnapshot(); },
        saveSnapshot: (fileName?: string) => VaporizeRef.current?.saveSnapshot(fileName) ?? Promise.resolve(false),
        isReady: () => VaporizeRef.current?.isReady() ?? false,
        isRunning: () => VaporizeRef.current?.isRunning() ?? false,
    }), []);
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
                resetAll={() => VaporizeRef.current?.resetAll()}
                start={() => VaporizeRef.current?.start()}
                stop={() => VaporizeRef.current?.stop()}
                refreshSnapshot={()=> VaporizeRef.current?.refreshSnapshot()}
                saveSnapshot={() => {
                    void VaporizeRef.current?.saveSnapshot();
                }}

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
    );
});