import { useState, useRef, useEffect } from "react";

import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import type { VaporizeConfig } from "./types";

interface DevToolsProps {
    config: VaporizeConfig;
    reset: () => void;
    resetAll: () => void;
    start: () => void;
    stop: () => void;
    refreshSnapshot: () => void;
    saveSnapshot: () => void;

    timeMaskGenerator: keyof typeof MasksGenerators;
    particleInitialState: keyof typeof ParticleInitialStates;
    particleEffect: keyof typeof ParticleEffects;

    setConfig: React.Dispatch<React.SetStateAction<VaporizeConfig>>;
    setTimeMaskGenerator: React.Dispatch<React.SetStateAction<keyof typeof MasksGenerators>>;
    setParticleInitialState: React.Dispatch<React.SetStateAction<keyof typeof ParticleInitialStates>>;
    setParticleEffect: React.Dispatch<React.SetStateAction<keyof typeof ParticleEffects>>;
}

export function DevTools({ config, reset, resetAll, start, stop, refreshSnapshot, saveSnapshot, timeMaskGenerator, particleInitialState, particleEffect, setConfig, setTimeMaskGenerator, setParticleInitialState, setParticleEffect }: DevToolsProps) {

    const [devToolsPosition, setDevToolsPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const dragHasMoved = useRef(false);
    const mountRef = useRef<HTMLDivElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (mountRef.current && !isInitialized) {
            const rect = mountRef.current.getBoundingClientRect();
            // Pozycja początkowa obok elementu mountRef
            setDevToolsPosition({
                x: rect.x + 20,
                y: rect.y
            });
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        setIsDragging(true);
        dragHasMoved.current = false;
        setDragOffset({
            x: e.clientX - devToolsPosition.x,
            y: e.clientY - devToolsPosition.y
        });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (isDragging) {
            dragHasMoved.current = true;
            setDevToolsPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleButtonClick = () => {
        if (!dragHasMoved.current) {
            setIsConfigOpen(prev => !prev);
        }
    };

    return (
        <>
        <div ref={mountRef} style={{ position: 'absolute', width: 0, height: 0 }} />
        <div style={{
            position: 'fixed',
            left: `${devToolsPosition.x}px`,
            top: `${devToolsPosition.y}px`,
            zIndex: 9999,
            width: 'max-content',
            opacity: isInitialized ? 1 : 0,
            pointerEvents: isInitialized ? 'auto' : 'none'
        }}>
            <button
                onClick={handleButtonClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    display: 'flex',
                    backgroundColor: 'rgb(89, 89, 89)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    border: 'none',
                    touchAction: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.82c.21-.16.27-.46.13-.7l-2.2-3.82c-.13-.23-.43-.31-.66-.23l-2.74 1.1c-.57-.44-1.17-.81-1.84-1.08L14 2.42C13.96 2.18 13.74 2 13.5 2h-4.4c-.24 0-.46.18-.5.42L8.21 5.37C7.54 5.64 6.94 6.01 6.37 6.45L3.63 5.35c-.23-.09-.53 0-.66.23L.77 9.4c-.13.24-.07.54.13.7l2.32 1.82C3.18 12.26 3.15 12.61 3.15 13s.03.74.07 1.08L1 15.9c-.21.16-.27.46-.13.7l2.2 3.82c.13.23.43.31.66.23l2.74-1.1c.57.44 1.17.81 1.84 1.08l.38 2.95c.04.24.26.42.5.42h4.4c.24 0 .46-.18.5-.42l.38-2.95c.67-.27 1.27-.64 1.84-1.08l2.74 1.1c.23.09.53 0 .66-.23l2.2-3.82c.13-.24.07-.54-.13-.7l-2.32-1.82Z"/>
                </svg>

            </button>
            {isConfigOpen && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    zIndex: 1,
                    backgroundColor: 'rgb(66, 66, 66)',
                    padding: 10,
                    paddingTop: 10,
                    borderRadius: 20,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    width: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 10,
                        marginBottom: 10,
                        alignSelf: 'flex-end',
                        marginLeft: 40
                    }}>
                        <style>{`
                            .dev-btn {
                                padding: 5px 10px;
                                border-radius: 10px;
                                border: none;
                                color: white;
                                cursor: pointer;
                                text-align: center;
                                font-size: 14px;
                                flex: 1;
                                transition: all 0.2s ease;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                                font-weight: 500;
                            }
                            .dev-btn:hover {
                                filter: brightness(1.15);
                                transform: translateY(-1px);
                                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                            }
                            .dev-btn:active {
                                filter: brightness(0.9);
                                transform: translateY(1px);
                                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                            }
                            .dev-label {
                                color: rgb(200,200,200);
                                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                                font-size: 12px;
                                margin-bottom: 4px;
                                font-weight: 600;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            .dev-select {
                                background-color: rgb(89,89,89);
                                color: white;
                                border: 1px solid rgb(100,100,100);
                                border-radius: 6px;
                                padding: 6px 8px;
                                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                                font-size: 13px;
                                font-weight: 500;
                                outline: none;
                                width: 100%;
                                cursor: pointer;
                                transition: border-color 0.2s;
                            }
                            .dev-select:hover {
                                border-color: rgb(150,150,150);
                            }
                            .dev-select:focus {
                                border-color: #41B0FF;
                            }
                        `}</style>
                        <button onClick={reset} className="dev-btn" style={{ backgroundColor: 'rgb(144, 69, 69)' }}> 
                            Reset
                        </button>
                        <button onClick={resetAll} className="dev-btn" style={{ backgroundColor: 'rgb(180, 50, 50)' }}> 
                            Reset All
                        </button>
                        <button onClick={start} className="dev-btn" style={{ backgroundColor: 'rgb(69, 144, 92)' }}> 
                            Start
                        </button>
                        <button onClick={stop} className="dev-btn" style={{ backgroundColor: 'rgb(164, 164, 164)' }}> 
                            Stop
                        </button>
                        <button onClick={refreshSnapshot} className="dev-btn" style={{ backgroundColor: 'rgb(69, 101, 144)' }}> 
                            Snapshot
                        </button>
                        <button onClick={saveSnapshot} className="dev-btn" style={{ backgroundColor: 'rgb(120, 85, 170)' }}>
                            Save PNG
                        </button>
                    </div>
                    <div style={{paddingLeft: 10, paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220}}>
                        {/* Ustawienia initialState */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="dev-label">Initial State</span>
                            <select 
                                className="dev-select"
                                value={particleInitialState}
                                onChange={(e) => {
                                    setParticleInitialState(e.target.value as keyof typeof ParticleInitialStates);
                                }}
                            >
                                {Object.keys(ParticleInitialStates).map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>

                        {/* Ustawienia ParticleEffect */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="dev-label">Particle Effect</span>
                            <select 
                                className="dev-select"
                                value={particleEffect}
                                onChange={(e) => {
                                    setParticleEffect(e.target.value as keyof typeof ParticleEffects);
                                    reset();
                                }}
                            >
                                {Object.keys(ParticleEffects).map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>

                        {/* Ustawienia TimeMaskGenerator */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="dev-label">Time Mask</span>
                            <select 
                                className="dev-select"
                                value={timeMaskGenerator}
                                onChange={(e) => {
                                    setTimeMaskGenerator(e.target.value as keyof typeof MasksGenerators);
                                }}
                            >
                                <option value="leftToRight">Left To Right</option>
                                <option value="rightToLeft">Right To Left</option>
                                <option value="topToBottom">Top To Bottom</option>
                                <option value="bottomToTop">Bottom To Top</option>
                                <option value="sand">Sand</option>
                                <option value="centerOut">Center Out</option>
                                <option value="edgesIn">Edges In</option>
                                <option value="splitHorizontal">Split Horizontal</option>
                                <option value="splitVertical">Split Vertical</option>
                                <option value="random">Random</option>
                                <option value="topLeftDiagonal">Diagonal (Left-Top)</option>
                                <option value="topRightDiagonal">Diagonal (Right-Top)</option>
                                <option value="bottomLeftDiagonal">Diagonal (Left-Bottom)</option>
                                <option value="bottomRightDiagonal">Diagonal (Right-Bottom)</option>
                            </select>
                        </div>

                        {/* Ustawienia Max Particles */}
                        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="dev-label" style={{ marginBottom: 0 }}>Max Particles</span>
                                <span style={{ color: 'white', fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>{config.maxParticles}</span>
                            </div>
                            <input 
                                type="range" 
                                min="100" 
                                max="10000" 
                                step="100" 
                                value={config.maxParticles}
                                onChange={(e) => {
                                    setConfig(prev => ({ ...prev, maxParticles: Number(e.target.value) }));
                                }}
                                style={{ marginTop: 8 }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 }}>
                            <span className="dev-label" style={{ marginBottom: 0 }}>Show Logs</span>
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, showLogs: !prev.showLogs }))}
                                className="dev-btn"
                                style={{
                                    backgroundColor: config.showLogs ? 'rgb(50, 160, 100)' : 'rgb(100, 100, 100)',
                                    minWidth: 52,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                }}
                            >
                                {config.showLogs ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )
}