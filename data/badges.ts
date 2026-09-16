import { parseBadgeCollection } from '../app/utils/badge-collection'
import collection from './badges.json'

export type { CollectionBadge } from '../app/utils/badge-collection'

// 前台与后台共用 JSON 数据，避免后台修改可执行的 TypeScript 源码。
export const badges = parseBadgeCollection(JSON.stringify(collection))
