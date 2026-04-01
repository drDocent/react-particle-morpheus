import { Settings } from 'lucide-react';
import { useState, useRef } from "react";

import { MasksGenerators } from "./maskGenerators";
import { ParticleInitialStates } from "./particleInitialStates";
import { ParticleEffects } from "./particleEffects";

import type { ParticleWrapperConfig } from "./types";

interface DevToolsProps {
    config: ParticleWrapperConfig;
    reset: () => void;
    start: () => void;
    stop: () => void;

    timeMaskGenerator: keyof typeof MasksGenerators;
    particleInitialState: keyof typeof ParticleInitialStates;
    particleEffect: keyof typeof ParticleEffects;

    setConfig: React.Dispatch<React.SetStateAction<ParticleWrapperConfig>>;
    setTimeMaskGenerator: React.Dispatch<React.SetStateAction<keyof typeof MasksGenerators>>;
    setParticleInitialState: React.Dispatch<React.SetStateAction<keyof typeof ParticleInitialStates>>;
    setParticleEffect: React.Dispatch<React.SetStateAction<keyof typeof ParticleEffects>>;
}

export function DevTools({ config, reset, start, stop, timeMaskGenerator, particleInitialState, particleEffect, setConfig, setTimeMaskGenerator, setParticleInitialState, setParticleEffect }: DevToolsProps) {

    const [devToolsPosition, setDevToolsPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const dragHasMoved = useRef(false);

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
        <div style={{
            position: 'relative',
            transform: `translate(${devToolsPosition.x}px, ${devToolsPosition.y}px)`,
            zIndex: 9999,
            width: 'max-content'
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
                <Settings style={{ color: 'white', width: 20, height: 20 }} />

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
                        <button onClick={start} className="dev-btn" style={{ backgroundColor: 'rgb(69, 144, 92)' }}> 
                            Start
                        </button>
                        <button onClick={stop} className="dev-btn" style={{ backgroundColor: 'rgb(164, 164, 164)' }}> 
                            Stop
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
                        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="dev-label" style={{ marginBottom: 0 }}>FPS</span>
                                <span style={{ color: 'white', fontSize: 13, fontFamily: "'Segoe UI', sans-serif" }}>{config.fps}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="200" 
                                step="1" 
                                value={config.fps}
                                onChange={(e) => {
                                    setConfig(prev => ({ ...prev, fps: Number(e.target.value) }));
                                    reset();
                                }}
                                style={{ marginTop: 8 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}