<script setup lang="ts">
const props = defineProps<{
	icon?: string
}>()

const icon = computed(() => props.icon || 'ph:chat-centered-text-duotone')
</script>

<template>
<div class="quote title-like">
	<div class="icon-line">
		<slot name="icon">
			<Icon :name="icon" />
		</slot>
	</div>
	<slot />
</div>
</template>

<style lang="scss" scoped>
.quote {
	font-size: 1.2rem;
	line-height: 1.5;
	color: var(--c-text-2);
	isolation: isolate;

	:deep(p) {
		margin: 0;
	}
}

.icon-line {
	position: relative;
	opacity: 0.5;
	min-height: 0.5em;
	margin-bottom: -0.5em;
	mask-image: linear-gradient(#FFF, transparent);
	font-size: 4rem;
	transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
	z-index: -1;

	@media (max-width: $breakpoint-phone) {
		font-size: 3rem;
	}

	@media (hover: hover) {
		:hover > & {
			opacity: 1;
			transform: translateY(-0.5rem);
		}
	}
}
</style>
