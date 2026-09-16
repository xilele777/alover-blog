<template>
<svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false">
	<g stroke="currentColor" stroke-width="2" stroke-linecap="round">
		<path d="M193 352C76 328 35 209 103 83M207 352c117-24 158-143 90-269" />
		<g v-for="side in [false, true]" :key="String(side)" :transform="side ? 'translate(400 0) scale(-1 1)' : undefined" fill="currentColor" fill-opacity="0.6" stroke="none">
			<path d="M97 98c-8-19-3-39 12-51 6 19 0 38-12 51Z" />
			<path d="M82 130c-22-10-30-26-28-46 19 10 28 25 28 46Zm-1 0c1-25 15-40 35-45-2 22-15 37-35 45Z" />
			<path d="M70 172c-24-9-35-23-37-44 22 7 34 23 37 44Zm0 0c-2-26 9-43 30-53 2 24-9 43-30 53Z" />
			<path d="M71 219c-27-3-43-16-48-37 24 3 39 16 48 37Zm0 0c-9-25-3-46 14-60 9 24 4 43-14 60Z" />
			<path d="M88 261c-26 5-46-3-58-21 25-5 44 3 58 21Zm0 0c-17-22-18-44-5-62 17 20 19 41 5 62Z" />
			<path d="M113 297c-24 11-46 9-62-6 24-12 44-9 62 6Zm0 0c-22-16-30-36-23-58 22 15 30 34 23 58Z" />
			<path d="M148 327c-21 15-43 17-63 6 21-16 42-17 63-6Zm0 0c-25-10-37-28-35-51 24 10 36 27 35 51Z" />
		</g>
	</g>
</svg>
</template>
