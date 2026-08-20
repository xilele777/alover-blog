<script setup lang="ts">
// BLOG_ADMIN_LOG_START
const blogLog = [
	{ label: '2026-03-16', value: '博客搭建完成' },
	{ label: '2026-05-16', value: '博客功能完善' },
	{ label: '2026-07-31', value: '新增后台' },
	{ label: '2026-08-10', value: '新增Wiki站入口' },
	{ label: '2026-08-21', value: '新增周报栏目' },
]
// BLOG_ADMIN_LOG_END
</script>

<template>
<BlogWidget card title="更新日志">
	<ZDlGroup size="large" :items="blogLog" />
</BlogWidget>
</template>
