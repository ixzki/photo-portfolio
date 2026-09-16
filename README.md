# Photo Portfolio

可自建的摄影作品集与旅行游记网站，使用 **Next.js + Neon Postgres + Vercel**。黑白配色，Jost / Noto Sans SC 字体，适配电脑与手机。

仓库提供通用示例作品、关于页面和一条完全合成的旅行路线。示例照片来自 Unsplash，路线、时间与海拔不代表真实行程。个人内容保存在部署者自己的数据库与图床中，详见[示例说明](./examples/README.md)。

## 快速体验

需要 **Node.js 24.x**，无需数据库或后台密码：

```powershell
npm ci
npm run demo
```

打开 [http://127.0.0.1:3200](http://127.0.0.1:3200)，示例旅行为 [/travel/example-journey](http://127.0.0.1:3200/travel/example-journey)。

示例启动器明确禁用数据库连接及内容写入，使用独立的 `.next-demo/` 构建目录，不读取本机数据库内容或覆盖 `.env.local`。构建和预览示例生产版本：

```powershell
npm run demo -- build
npm run demo -- start
```

## 功能

- **摄影作品**：首页精选、作品列表、全屏封面、多种按行图片版式和图片放大。
- **旅行地图**：灰度路线总览，点击进入游记；首屏路线轮廓、距离、时长和起止时间，全程地图随滚动绘制路线并展示精选点位。
- **游记阅读**：正文与图片居中，随行地图跟随阅读位置，点位列表动态突出当前段落；移动端减少浮层，照片保持比例并限制在视口高度内。
- **旅行后台**：上传 CSV 后自动识别起止时间，保留逐点时间和海拔；选择点位、选取路段、手绘线路，为每段行程编写 Markdown 图文，选择精选点位，保存草稿或发布。
- **作品与内容后台**：作品图片编排、排序和跨行移动，首页精选、媒体 URL 库、关于页面及网站设置，保存快捷键和未保存提醒。
- **加载与缓存**：公开旅行及网站设置缓存 5 分钟，后台保存后失效；加载字标跟随网站名称，页面顶端显示滚动进度，支持减少动态效果。

## 连接自己的内容

首次配置时复制 `.env.example` 为 `.env.local`；已有配置时保留原文件。填写 Neon **开发分支**的 `DATABASE_URL` 和独立 `ADMIN_PASSWORD`，需要编辑时设置 `PREVIEW_READ_ONLY=false`。

配置自己的图片域名：又拍云填写 `NEXT_PUBLIC_UPYUN_HOSTS`，其他图床填写 `IMAGE_REMOTE_HOSTS`。均为逗号分隔的纯域名，例如 `cdn.example.com`。仓库没有内置个人图床，也不会自动改写你的图片域名。

```powershell
npm run check:env
node scripts/migrate-travel.mjs
npm run preview
```

访问 [http://127.0.0.1:3100](http://127.0.0.1:3100) 和 [/admin](http://127.0.0.1:3100/admin)。已有站点建议使用独立 Neon 开发分支；基础表需要先配置，`/setup` 提供说明，不自动建表。详细步骤见[本地运行与部署](./docs/deployment.md)。

旅行迁移默认只建表，不写入示例。只有需要在自己的示例数据库加入演示路线时，才执行 `node scripts/migrate-travel.mjs --seed-example`；这是一次性插入，重复执行不会覆盖编辑或恢复已删除的示例。

后台 CSV 导入可以使用 [examples/example-journey.csv](./examples/example-journey.csv) 练习。真实 CSV、数据库备份和凭据应保存在仓库外；`.gitignore` 仅为明确的 `examples/*.csv` 保留提交入口。

## 发布与检查

GitHub 保存代码，Vercel 发布应用，Neon 保存内容。**推送 Git 和重新部署不会同步数据库，也不会用仓库示例覆盖正式内容。** 修改图片域名等构建环境变量后需重新部署。

```powershell
npm test
npm run lint
npm run check:env
npm run build
```

`check:env` 是目标数据库的只读检查。没有数据库时用 `npm run demo -- build` 验证示例构建。内容迁移与生产数据同步需单独核对源、目标和备份，详见[部署说明](./docs/deployment.md)。

Windows 本地预览可用 `scripts/start-preview.ps1` / `scripts/stop-preview.ps1` 后台启停；日志保存在被忽略的 `.local-preview/` 中。

## 目录

```text
src/
  app/          前台、后台与 API
  components/   共用组件
  lib/          数据库、校验与业务逻辑
  workers/      CSV 后台解析
  data/         合成示例路线
examples/       示例 CSV 与数据说明
public/         静态资源
scripts/        环境检查、旅行迁移、示例与本地预览
test/          自动化回归测试
docs/           使用、部署与界面说明
```

`.env.local`、依赖、构建产物、本地日志及个人导出文件不应提交到 GitHub。

完整说明见[文档目录](./docs/README.md)，常用入口：[旅行后台](./docs/travel-admin.md)、[CSV 导入](./docs/travel-csv-import.md)、[示例内容](./examples/README.md)。

Node.js 24 · Next.js 16.3.4 · React 19.2 · TypeScript · Leaflet · react-markdown / remark-gfm · Neon Postgres · Vercel
