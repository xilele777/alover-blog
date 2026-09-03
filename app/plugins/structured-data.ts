export default defineNuxtPlugin(() => {
  const appConfig = useAppConfig()

  // 全局网站结构化数据
  useSchemaOrg([
    defineOrganization({
      name: appConfig.title,
      logo: new URL(appConfig.author.avatar, appConfig.url).href,
      sameAs: [appConfig.author.homepage],
    }),
    defineWebSite({
      name: appConfig.title,
      description: appConfig.description,
    }),
    defineWebPage(),
  ])
})
