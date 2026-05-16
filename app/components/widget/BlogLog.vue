<script setup lang="ts">
const { timeEstablished } = useAppConfig()

const blogLog = [
	{ label: '2026-03-16', value: '博客搭建完成' },
	{ label: '2026-05-16', value: '博客功能完善' },
]
</script>

<template>
<BlogWidget card title="更新日志">
	<ZDlGroup size="large" :items="blogLog" />
</BlogWidget>
</template>
