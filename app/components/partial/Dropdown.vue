<!-- https://vue-tippy.netlify.app/props/ -->
<!-- 如果要点击触发，请使用 trigger="focusin" 并添加 tabindex="0" -->
<!--
	aria.expanded 置 false 是为了让 tippy 不要在外层 <span> 上写 aria-expanded：
	该 span 没有 role，带 aria-expanded 会触发 aria-allowed-attr 无障碍失败；
	真正的控件是插槽里的 <button>，给 span 加 role="button" 反而会造成交互元素嵌套。
-->
<template>
<Tooltip
	class="dropdown"
	interactive
	placement="bottom"
	:arrow="false"
	:hide-on-click="false"
	:offset="[0, 0]"
	:aria="{ expanded: false }"
>
	<slot />
	<template #content="{ hide }">
		<slot name="content" :hide />
	</template>
</Tooltip>
</template>

<style lang="scss" scoped>
// https://vue-tippy.netlify.app/props#appendto
// Tooltip 位于组件根部时，interactive tippy 会插入到父组件
:deep() ~ [data-tippy-root] > .tippy-box {
	padding: 0.3em;
	font-size: inherit;

	&[data-placement="top"] {
		--c-fill: var(--c-bg-1);
	}
}

:deep() ~ [data-tippy-root] .tippy-content {
	display: grid;

	button {
		padding: 0.3em 0.5em;
		border-radius: 0.3em;
		text-align: start;
		color: var(--c-text-1);
		transition: color var(--dur-instant) var(--ease-out), background-color var(--dur-instant) var(--ease-out);
		cursor: pointer;

		@media (hover: hover) {
			&:hover {
				background-color: var(--c-bg-soft);
				color: var(--c-text-1);
			}
		}

		&.active {
			background-color: var(--c-primary-soft);
			color: var(--c-primary);
		}
	}
}
</style>
