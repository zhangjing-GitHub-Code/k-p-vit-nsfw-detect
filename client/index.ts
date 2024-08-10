import { Context } from '@koishijs/client'
import Page from './extstatus.vue'

export default (ctx: Context) => {
  ctx.page({
    name: '页面标题',
    path: '/custom-page',
    component: Page,
  })
}
