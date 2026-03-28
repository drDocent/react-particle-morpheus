import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import domtoimage from 'dom-to-image-more';

export interface ParticleWrapperRef {
    reset: () => void;
    start: () => void;
    stop: () => void;
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

    velocityX: number; // Opcjonalna prędkość w osi X
    velocityY: number; // Opcjonalna prędkość w osi Y
    accelerationX: number; // Opcjonalne przyspieszenie w osi X
    accelerationY: number; // Opcjonalne przyspieszenie w osi Y

    lifetime?: number; // Opcjonalna żywotność cząsteczki (np. w sekundach)
}

interface ParticleWrapperProps {
    children: React.ReactNode;
    applyParticeleEffect: (particle: Particle, deltaTime: number) => Particle | null; // Funkcja do aktualizacji stanu cząsteczki
}

const maxParticles = 2000;
const fps = 120;

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

    function test(){
        const childrenElement = childrenRef.current
        if (!childrenElement) return

    }

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

        test()

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

        const computedStyle = window.getComputedStyle(childrenElement);

        // Pobieramy dokładne wartości dla każdego z 4 rogów osobno
        const getRadius = (val: string) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) return 0;
            if (val.includes('%')) {
                return (parsed / 100) * Math.min(w, h);
            }
            return parsed;
        };

        const rtl = Math.min(getRadius(computedStyle.borderTopLeftRadius), w / 2, h / 2);
        const rtr = Math.min(getRadius(computedStyle.borderTopRightRadius), w / 2, h / 2);
        const rbr = Math.min(getRadius(computedStyle.borderBottomRightRadius), w / 2, h / 2);
        const rbl = Math.min(getRadius(computedStyle.borderBottomLeftRadius), w / 2, h / 2);

        const particlesArray: Particle[] = []

        for (let i = 0; i < w; i += particleWidth) {
            for (let j = 0; j < h; j += particleHeight) {
                // Testujemy NAJBARDZIEJ WYSUNIĘTE KRAWĘDZIE cząsteczki, żeby żadna
                // nie wystawała poza przycisk. Zamiast testować jedynie środek particla, 
                // sprawdzamy, czy w danym rogu "wisi" jakiś niepożądany fragment kwadracika.

                const pLeft = i;
                const pRight = i + particleWidth;
                const pTop = j;
                const pBottom = j + particleHeight;

                let isInside = true;

                // Lewy górny róg
                if (pLeft < rtl && pTop < rtl) {
                    if (Math.pow(pLeft - rtl, 2) + Math.pow(pTop - rtl, 2) > Math.pow(rtl, 2)) isInside = false;
                }
                // Prawy górny róg
                if (pRight > w - rtr && pTop < rtr) {
                    if (Math.pow(pRight - (w - rtr), 2) + Math.pow(pTop - rtr, 2) > Math.pow(rtr, 2)) isInside = false;
                }
                // Prawy dolny róg
                if (pRight > w - rbr && pBottom > h - rbr) {
                    if (Math.pow(pRight - (w - rbr), 2) + Math.pow(pBottom - (h - rbr), 2) > Math.pow(rbr, 2)) isInside = false;
                }
                // Lewy dolny róg
                if (pLeft < rbl && pBottom > h - rbl) {
                    if (Math.pow(pLeft - rbl, 2) + Math.pow(pBottom - (h - rbl), 2) > Math.pow(rbl, 2)) isInside = false;
                }

                if (isInside) {
                    particlesArray.push({ startX: x + i, startY: y + j, offsetX: 0, offsetY: 0, width: Math.min(particleWidth, w - i), height: Math.min(particleHeight, h - j), velocityX: 0, velocityY: 0, accelerationX: 0, accelerationY: 0, lifetime: Math.random() })
                }
            }
        }
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