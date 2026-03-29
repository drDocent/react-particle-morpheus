import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import domtoimage from 'dom-to-image-more';

export interface ParticleWrapperRef {
    reset: () => void;
    start: () => void;
    stop: () => void;
}

export interface ParticlePhysics {
    velocityX: number;
    velocityY: number;
    accelerationX: number;
    accelerationY: number;

    lifetime?: number;
}

export interface Particle {
    // Nie trzymamy jedynie x oraz y bo jak się zmienia pozycja buttonu
    // w trakcie animacji to chcemy mieć nad tym kontrolę

    startX: number; // Pozycja początkowa X z przycisku
    startY: number; //pozycja początkowa Y z przycisku

    offsetX: number; // Przesunięcie X od pozycji początkowej
    offsetY: number; // Przesunięcie Y od pozycji początkowej

    height: number; // Wysokość cząsteczki
    width: number; // Szerokość cząsteczki


    particlePhysics: ParticlePhysics; // Właściwości fizyczne cząsteczki (prędkość, przyspieszenie, itp.)
}

interface ParticleWrapperProps {
    children: React.ReactNode;
    applyParticeleEffect: (particle: Particle, deltaTime: number) => Particle | null; // Funkcja do aktualizacji stanu cząsteczki
}

const maxParticles = 2000;
const fps = 120;

const initialParticlePhysics: ParticlePhysics = {
    velocityX: (Math.random() - 0.5) * 100,
    velocityY: (Math.random() - 0.5) * 100,
    accelerationX: 0,
    accelerationY: 100,
    lifetime: 2 + Math.random() * 3,
}

export const ParticleWrapper = forwardRef<ParticleWrapperRef, ParticleWrapperProps>(({ children, applyParticeleEffect}, ref) => {
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    const particles = useRef<Particle[]>([])
    const animationFrameId = useRef<number>(0)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const childrenRef = useRef<HTMLDivElement>(null)

    function drawParticles() {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                particles.current.forEach(particle => {
                    ctx.fillStyle = "#30A2F9"
                    ctx.fillRect(particle.startX + particle.offsetX, particle.startY + particle.offsetY, particle.width, particle.height)
                })
            }
        }
    }

    function createParticles() {
        const childrenElement = childrenRef.current
        if (!childrenElement) return

        const rect = childrenElement.getBoundingClientRect()
        const x = rect.x
        const y = rect.y
        const w = rect.width
        const h = rect.height

        const idealCols = Math.sqrt(maxParticles * (w / h));
        const idealRows = Math.sqrt(maxParticles * (h / w));

        // 2. Zaokrąglamy do pełnych liczb (używamy Math.round dla najbliższego dopasowania)
        let cols = Math.round(idealCols);
        let rows = Math.round(idealRows);

        // Opcjonalne zabezpieczenie: jeśli zaokrąglenia sprawią, że przekroczymy 1000,
        // możemy zmniejszyć tę wartość, która została zaokrąglona w górę.
        if (cols * rows > maxParticles) {
            if (idealCols - Math.floor(idealCols) > idealRows - Math.floor(idealRows)) {
                cols = Math.floor(idealCols);
            } else {
                rows = Math.floor(idealRows);
            }
        }

        // 3. Obliczamy finalne, rzeczywiste wymiary cząsteczki (Twoje x i y)
        const particleWidth = w / cols;   // To jest Twoje x
        const particleHeight = h / rows;  // To jest Twoje y

        const particlesArray: Particle[] = []

        domtoimage.toPixelData(childrenRef.current).then(function (pixelData) {
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            ctx.putImageData(new ImageData(pixelData, w, h), x, y);

            for(let i = 0; i < cols; i+= particleWidth){
                for(let j = 0; j < rows; j+= particleHeight){
                    for(let px = 0; px < particleWidth; px++){
                        for(let py = 0; py < particleHeight; py++){
                            const pixelIndex = ((j + py) * w + (i + px)) * 4;
                            const r = pixelData[pixelIndex];
                            const g = pixelData[pixelIndex + 1];
                            const b = pixelData[pixelIndex + 2];
                            const a = pixelData[pixelIndex + 3];

                            if(a > 0){ // Jeśli piksel nie jest przezroczysty
                                particlesArray.push({
                                    startX: x + i,
                                    startY: y + j,
                                    offsetX: 0,
                                    offsetY: 0,
                                    width: particleWidth,
                                    height: particleHeight,
                                    colors: [[`rgba(${r}, ${g}, ${b}, ${a / 255})`]],
                                    velocityX: (Math.random() - 0.5) * 100, // Przykładowa prędkość X
                                    velocityY: (Math.random() - 0.5) * 100, // Przykładowa prędkość Y
                                    accelerationX: 0, // Brak przyspieszenia X
                                    accelerationY: 100, // Przykładowe przyspieszenie Y (grawitacja)
                                    lifetime: 2 + Math.random() * 3, // Przykładowa żywotność między 2 a 5 sekund
                                });
                            }
                        }
                    }
                }
            }
        });

        particles.current = particlesArray
        drawParticles()
    }

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (!isRunning) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let lastTime = 0;
        const interval = 1000 / fps;
        let lastButtonX: number | null = null;
        let lastButtonY: number | null = null;

        function frame(currentTime: number) {
            if (!ctx || !canvas) return
            animationFrameId.current = requestAnimationFrame(frame)

            const delta = currentTime - lastTime
            if (delta < interval) return
            lastTime = currentTime

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            //updatowanie pozycji cząsteczek jeżeli zmieniła się pozycja buttonu
            const childrenElement = childrenRef.current
            if (childrenElement) {
                const rect = childrenElement.getBoundingClientRect()
                const x = rect.x
                const y = rect.y

                // Zamiast generować całą tablicę na nowo, co jest nieoptymalne,
                // obliczamy tylko o ile przesunął się przycisk.
                let diffX = 0;
                let diffY = 0;
                if (lastButtonX !== null && lastButtonY !== null) {
                    diffX = x - lastButtonX;
                    diffY = y - lastButtonY;
                }
                lastButtonX = x;
                lastButtonY = y;

                particles.current = particles.current.map(particle => {
                    // Aplikujemy przesunięcie wywołane m.in. zmianą rozszerzenia okna
                    const p = {
                        ...particle,
                        startX: particle.startX + diffX,
                        startY: particle.startY + diffY,
                    }
                    return applyParticeleEffect(p, Math.min(delta / 1000, 0.1))
                }).filter(particle => particle !== null) as Particle[]

                drawParticles()
            }
        }

        animationFrameId.current = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(animationFrameId.current)
        }
    }, [isRunning, canvasRef, applyParticeleEffect])


    useEffect(() =>{
        if (canvasRef.current) {
            createParticles()
        }
    }, [canvasRef])

    function reset(){
        setIsRunning(false)
        createParticles()
    }

    function start(){
        setIsRunning(true)
    }

    function stop(){
        setIsRunning(false)
    }

    useImperativeHandle(ref, () => ({
        reset,
        start,
        stop
    }))

    return (
        <div>
            <div ref={childrenRef}>
                {children}
            </div>
            <canvas
                ref={canvasRef}
                width={windowSize.width}
                height={windowSize.height}
                style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}
            />
        </div>
    );
})