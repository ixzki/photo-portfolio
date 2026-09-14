# 后台足迹 CSV 导入

原始 CSV 在浏览器的独立 Web Worker 中逐块读取，仅保留选定时间范围内的轨迹。原始文件不会上传到 Vercel 或写入 Neon；保存旅行时提交筛选后的路线及编辑内容。

## 字段与格式

| 内容 | 支持的表头示例 |
| --- | --- |
| 时间 | `dataTime`、`timestamp`、`time`、`datetime`、`date`、`record_time`、时间、记录时间、定位时间 |
| 纬度 | `latitude`、`lat`、纬度 |
| 经度 | `longitude`、`lng`、`lon`、经度 |
| 定位误差（米，可选） | `accuracy`、`horizontal_accuracy`、精度、水平精度、定位精度 |

表头不区分大小写，忽略空格、下划线和连字符。同一类字段若出现多列会提示先保留一列，不会猜测使用哪列。

- CSV 支持 UTF-8、带 BOM 的 UTF-16 LE/BE；支持逗号分隔、双引号转义、引号内换行和 Windows 换行。其他编码请先另存为 UTF-8 CSV。
- 坐标使用 **WGS84**，纬度范围 ±85.051129、经度范围 ±180。导入器不进行 GCJ-02/BD-09 坐标转换。
- 时间支持 Unix 秒、Unix 毫秒及 `2026-06-24T08:00:00+08:00` 等 ISO 格式。没有时区的时间固定按北京时间 UTC+8 处理，不受电脑时区影响。
- 开始和结束时刻都包含在筛选范围内；例如结束 `10:25` 表示截至 `10:25:00`。如需完整一天，使用下一天开始前的 `23:59:59`。
- 定位误差设为 0 时不筛选；启用时必须有精度列，超过设定误差的点会跳过。
- 轨迹按时间排序，相邻位置重复时去重。默认相隔超过 60 分钟或 5 公里即断段，不连接缺失轨迹；不足两个点的孤立段不生成线路。
- 输出最多 80,000 个点、3 MB，超出后要求缩小日期范围，不会自动抽稀改变路线。导入时不会识别或自动移除航班，应在时间范围中选定自驾起止时刻。

导入结果展示 CSV 记录总数、筛选后记录数、最终点数、线路段数和无效记录数。无效时间、坐标、选定时段内的无效精度或列数错误会计入无效记录；破损的 CSV 引号结构会停止导入并提示修复文件。

## 开发接口

Worker 文件：`src/workers/travel-csv.worker.ts`。编辑器为每次导入创建一个 Worker，并在取消或卸载时调用 `terminate()`。

输入：

```ts
{ file: File, options: { from: string, to: string, maxAccuracy: number, gapMinutes: number, gapKm: number } }
```

输出：

```ts
{ type: "progress", percent: number }
{ type: "complete", segments: [number, number][][], stats: { rows, matched, points, segments, invalid, from, to } }
{ type: "error", error: string }
```

`src/lib/travel-csv.ts` 导出纯解析器及 `importTravelCsvFile`，可用 Node 24 直接运行测试：`node --test test/travel-csv.test.mjs`。浏览器页面只在 Worker 中调用文件导入，避免解析大文件时阻塞地图编辑。

已用本地缓存的 29,500 条真实记录重建 CSV 进行一致性检查：`2026-06-24T08:02:36` 至 `2026-06-28T14:16:34`、定位误差上限 100 米、默认断段阈值，生成 20,168 个点、8 段轨迹，与目前新疆路线逐点一致。原始导出路径在本次检查时已不存在，未将此验证描述为重新读取原始完整文件。
