# Photo Portfolio

个人摄影作品集与旅行游记网站，使用 **Next.js + Neon Postgres + Vercel**，照片通过又拍云图片 URL 加载。前台延续黑白配色、Jost / Noto Sans SC 字体和反色交互，适配电脑与手机。

## 功能

- **摄影作品**：首页精选、作品列表、全屏封面、按行编排的照片和图片放大查看。
- **旅行地图**：整屏展示不同灰度的旅行路线，点击进入游记；详情首屏展示封面和完整路线轮廓，阅读正文时左上角地图随进度延伸路线。
- **旅行后台**：导入“一生足迹”等 CSV，筛选时间范围，在地图上添加点位、选取路段或手绘线路，为每段行程编写 Markdown 图文，支持草稿与发布。
- **作品后台**：作品信息、展示图片、图片编排和更多设置分区；完整行预览、图片排序与跨行移动，常驻保存、快捷键及未保存提醒。
- **内容管理**：首页精选、媒体 URL 库、关于页面与站点设置。图片文件仍存放在图床，后台管理图片地址与元数据。

## 本地运行

需要 **Node.js 24.x**。首次配置时，将 `.env.example` 复制为 `.env.local`；已有文件时保留原配置。

```powershell
npm ci
```

在 `.env.local` 填写 Neon **开发分支**的 `DATABASE_URL` 和独立的 `ADMIN_PASSWORD`。如需编辑数据，将 `PREVIEW_READ_ONLY` 改为 `false`。建议从现有生产数据库创建开发分支，以获得基础表和初始内容。

```powershell
npm run check:env
node scripts/migrate-travel.mjs
npm run preview
```

旅行迁移会建表并写入一次性新疆种子；重跑不覆盖已有旅行。它不会同步其他分支后续编辑的内容。运行前确认连接的是目标开发分支。

- 网站：[http://127.0.0.1:3100](http://127.0.0.1:3100)
- 后台：[http://127.0.0.1:3100/admin](http://127.0.0.1:3100/admin)

预览只监听本机。Windows 可用 `scripts/start-preview.ps1` / `scripts/stop-preview.ps1` 在后台启停，日志保存在 `.local-preview/`。`/setup` 仅说明配置，不执行数据库初始化。

## 发布与数据同步

GitHub 保存代码；Vercel 构建并发布应用；Neon 保存作品、旅行和设置。**推送 Git 或重新部署不会把开发数据库内容同步到生产。** 发布当前编辑结果时，需要分别完成代码部署、目标数据库迁移和内容同步，并核对生产环境变量。

```powershell
npm test
npm run lint
npm run check:env
npm run build
```

`check:env` 是基础数据库的只读检查；旅行表、内容一致性以及线上页面需单独验证。`.env.local`、数据库备份、原始足迹 CSV 和本地日志不应提交到 GitHub。

## 文档与技术栈

- [本地预览与 Vercel 部署](./本地预览与Vercel部署.md)：环境变量、数据库迁移、发布与回退。
- [旅行后台](./docs/travel-admin.md)：地图编辑、Markdown、发布规则与 API。
- [足迹 CSV 导入](./docs/travel-csv-import.md)：字段、坐标、时间与导入限制。
- [前台 UI 规范](./docs/public-ui-style.md)：网站视觉与交互约定。

Node.js 24 · Next.js 16.3.4 · React 19.2 · TypeScript · Leaflet · react-markdown / remark-gfm · Neon Postgres · Vercel
