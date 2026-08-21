<script setup lang="ts">
type ParticleType = 'snow' | 'petal'

interface Particle {
	type: ParticleType
	x: number
	y: number
	size: number
	speed: number
	drift: number
	phase: number
	sway: number
	rotation: number
	rotationSpeed: number
	tilt: number
	tiltSpeed: number
	opacity: number
	variant: number
}

interface SpriteSet {
	snow: HTMLCanvasElement[]
	petal: HTMLCanvasElement[]
}

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

const particles: Particle[] = []
const sprites: SpriteSet = { snow: [], petal: [] }
let context: CanvasRenderingContext2D | null = null
let frameId = 0
let lastFrame = 0
let resizeTimer = 0
let width = 0
let height = 0

const palette = computed(() => colorMode.value === 'dark'
	? { snow: '220 238 255', petal: '255 161 193', petalEdge: '218 102 145' }
	: { snow: '126 163 196', petal: '244 135 171', petalEdge: '211 91 137' })

function particleCount() {
	const area = width * height
	const density = width < 768 ? 16_000 : 18_000
	const minimum = width < 768 ? 24 : 38
	const maximum = width < 768 ? 42 : 80

	return Math.min(maximum, Math.max(minimum, Math.round(area / density)))
}

function resetParticle(particle: Particle, initial = false) {
	const depth = 0.55 + Math.random() * 0.75

	particle.x = Math.random() * width
	particle.y = initial ? Math.random() * height : -particle.size * 2
	particle.size = particle.type === 'snow'
		? (10 + Math.random() * 9) * depth
		: (12 + Math.random() * 11) * depth
	particle.speed = (particle.type === 'snow' ? 22 + Math.random() * 24 : 28 + Math.random() * 30) * depth
	particle.drift = (Math.random() - 0.5) * (particle.type === 'snow' ? 10 : 18)
	particle.phase = Math.random() * Math.PI * 2
	particle.sway = particle.type === 'snow' ? 7 + Math.random() * 12 : 14 + Math.random() * 24
	particle.rotation = Math.random() * Math.PI * 2
	particle.rotationSpeed = (Math.random() - 0.5) * (particle.type === 'snow' ? 0.7 : 1.8)
	particle.tilt = Math.random() * Math.PI * 2
	particle.tiltSpeed = 1.2 + Math.random() * 2.2
	particle.opacity = (0.32 + Math.random() * 0.38) * Math.min(depth, 1)
	particle.variant = Math.floor(Math.random() * 3)
}

function createParticle(index: number): Particle {
	const particle: Particle = {
		type: index % 5 < 3 ? 'snow' : 'petal',
		x: 0,
		y: 0,
		size: 0,
		speed: 0,
		drift: 0,
		phase: 0,
		sway: 0,
		rotation: 0,
		rotationSpeed: 0,
		tilt: 0,
		tiltSpeed: 0,
		opacity: 0,
		variant: 0,
	}

	resetParticle(particle, true)
	return particle
}

function syncParticles() {
	const count = particleCount()

	while (particles.length < count)
		particles.push(createParticle(particles.length))
	particles.length = count
}

function createSprite(size = 72) {
	const sprite = document.createElement('canvas')
	sprite.width = size
	sprite.height = size
	return sprite
}

function createSnowSprite(variant: number, color: string) {
	const sprite = createSprite()
	const spriteContext = sprite.getContext('2d')!
	const radius = 22 + variant * 2

	spriteContext.translate(36, 36)
	spriteContext.strokeStyle = `rgb(${color} / 0.92)`
	spriteContext.fillStyle = `rgb(${color} / 0.95)`
	spriteContext.lineCap = 'round'
	spriteContext.lineWidth = 1.5 + variant * 0.15
	spriteContext.shadowColor = `rgb(${color} / 0.45)`
	spriteContext.shadowBlur = 3

	for (let arm = 0; arm < 6; arm++) {
		spriteContext.save()
		spriteContext.rotate(arm * Math.PI / 3)
		spriteContext.beginPath()
		spriteContext.moveTo(0, 0)
		spriteContext.lineTo(0, -radius)

		for (const branchAt of [0.5, 0.72]) {
			const y = -radius * branchAt
			const branch = 5 + variant + branchAt * 2
			spriteContext.moveTo(0, y)
			spriteContext.lineTo(-branch, y + branch * 0.65)
			spriteContext.moveTo(0, y)
			spriteContext.lineTo(branch, y + branch * 0.65)
		}

		spriteContext.stroke()
		spriteContext.restore()
	}

	spriteContext.beginPath()
	spriteContext.arc(0, 0, 2.2, 0, Math.PI * 2)
	spriteContext.fill()
	return sprite
}

function createPetalSprite(variant: number, color: string, edgeColor: string) {
	const sprite = createSprite()
	const spriteContext = sprite.getContext('2d')!
	const widthScale = 0.9 + variant * 0.08
	const gradient = spriteContext.createLinearGradient(36, 13, 36, 59)

	gradient.addColorStop(0, `rgb(${color} / 0.72)`)
	gradient.addColorStop(0.58, `rgb(${color} / 0.98)`)
	gradient.addColorStop(1, `rgb(${edgeColor} / 0.92)`)

	spriteContext.translate(36, 36)
	spriteContext.scale(widthScale, 1)
	spriteContext.beginPath()
	spriteContext.moveTo(0, 24)
	spriteContext.bezierCurveTo(-17, 17, -24, 2, -18, -13)
	spriteContext.bezierCurveTo(-14, -23, -5, -25, 0, -16)
	spriteContext.bezierCurveTo(5, -25, 14, -23, 18, -13)
	spriteContext.bezierCurveTo(24, 2, 17, 17, 0, 24)
	spriteContext.closePath()
	spriteContext.fillStyle = gradient
	spriteContext.shadowColor = `rgb(${edgeColor} / 0.35)`
	spriteContext.shadowBlur = 4
	spriteContext.fill()
	spriteContext.strokeStyle = `rgb(${edgeColor} / 0.55)`
	spriteContext.lineWidth = 1
	spriteContext.stroke()

	spriteContext.beginPath()
	spriteContext.moveTo(0, 20)
	spriteContext.quadraticCurveTo(-2, 2, 0, -13)
	spriteContext.strokeStyle = `rgb(${edgeColor} / 0.38)`
	spriteContext.stroke()
	return sprite
}

function refreshSprites() {
	if (!import.meta.client)
		return

	sprites.snow = Array.from({ length: 3 }, (_, variant) => createSnowSprite(variant, palette.value.snow))
	sprites.petal = Array.from({ length: 3 }, (_, variant) => createPetalSprite(variant, palette.value.petal, palette.value.petalEdge))
}

function resizeCanvas() {
	if (!canvas.value)
		return

	width = window.innerWidth
	height = window.innerHeight
	const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

	canvas.value.width = Math.round(width * pixelRatio)
	canvas.value.height = Math.round(height * pixelRatio)
	canvas.value.style.width = `${width}px`
	canvas.value.style.height = `${height}px`

	context = canvas.value.getContext('2d')
	context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
	syncParticles()
}

function restartAnimation() {
	resizeCanvas()
	stopAnimation()
	startAnimation()
}

function drawParticle(particle: Particle) {
	if (!context)
		return

	const sprite = sprites[particle.type][particle.variant]
	if (!sprite)
		return

	const tumble = particle.type === 'petal' ? 0.24 + Math.abs(Math.cos(particle.tilt)) * 0.76 : 1
	const drawWidth = particle.size
	const drawHeight = particle.size * tumble

	context.save()
	context.globalAlpha = particle.opacity
	context.translate(particle.x, particle.y)
	context.rotate(particle.rotation)
	context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
	context.restore()
}

function drawFrame(timestamp: number) {
	if (!context || reducedMotion.value === 'reduce' || visibility.value !== 'visible') {
		frameId = 0
		return
	}

	const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0
	lastFrame = timestamp
	context.clearRect(0, 0, width, height)

	for (const particle of particles) {
		particle.phase += delta * (particle.type === 'snow' ? 0.9 : 1.35)
		particle.x += (particle.drift + Math.sin(particle.phase) * particle.sway) * delta
		particle.y += (particle.speed + Math.cos(particle.phase * 0.7) * 3) * delta
		particle.rotation += particle.rotationSpeed * delta
		particle.tilt += particle.tiltSpeed * delta

		if (particle.y > height + particle.size * 2 || particle.x < -60 || particle.x > width + 60)
			resetParticle(particle)

		drawParticle(particle)
	}

	frameId = requestAnimationFrame(drawFrame)
}

function stopAnimation(clear = false) {
	if (frameId)
		cancelAnimationFrame(frameId)
	frameId = 0
	lastFrame = 0

	if (clear)
		context?.clearRect(0, 0, width, height)
}

function startAnimation() {
	if (frameId || reducedMotion.value === 'reduce' || visibility.value !== 'visible')
		return

	frameId = requestAnimationFrame(drawFrame)
}

function onResize() {
	window.clearTimeout(resizeTimer)
	resizeTimer = window.setTimeout(restartAnimation, 120)
}

watch([reducedMotion, visibility], () => {
	if (reducedMotion.value === 'reduce' || visibility.value !== 'visible')
		stopAnimation(reducedMotion.value === 'reduce')
	else
		startAnimation()
})

watch(() => colorMode.value, refreshSprites)

onMounted(() => {
	refreshSprites()
	resizeCanvas()
	window.addEventListener('resize', onResize, { passive: true })
	startAnimation()
})

onBeforeUnmount(() => {
	stopAnimation()
	window.clearTimeout(resizeTimer)
	window.removeEventListener('resize', onResize)
})
</script>

<template>
<canvas ref="canvas" class="falling-decor" aria-hidden="true" />
</template>

<style lang="scss" scoped>
.falling-decor {
	contain: strict;
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: -1;

	@media (prefers-reduced-motion: reduce) {
		display: none;
	}
}
</style>
