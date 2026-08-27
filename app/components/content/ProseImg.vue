<script setup lang="ts">
defineProps<{
	src?: string
	alt?: string
	width?: string | number
	height?: string | number
}>()
</script>

<template>
<NuxtImg
	:src
	:alt
	:width
	:height
	loading="lazy"
	decoding="async"
	sizes="(max-width: 640px) 100vw, 30rem"
/>
</template>
