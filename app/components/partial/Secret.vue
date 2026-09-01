<template>
<!-- 外层元素用于占位 -->
<div class="secret-container">
	<div class="secret">
		<slot />
	</div>
</div>
</template>

<style lang="scss" scoped>
.secret {
	position: relative;
	opacity: 0;

	// 揭示刻意延迟，避免指针扫过就闪一下；color 不跟着延迟，否则深浅色切换时
	// 这块文字要等半秒才换色
	transition: opacity var(--dur-fast) var(--ease-out) var(--secret-delay, 0.5s), z-index var(--dur-fast) var(--secret-delay, 0.5s), color var(--dur-instant) var(--ease-out);
	z-index: -1;

	:hover > &,
	:focus-within > & {
		opacity: 1;
		z-index: 0;
	}
}
</style>
