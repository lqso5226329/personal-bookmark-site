# 项目记录

记录日期：2026-06-26

## 项目概况

- 项目名称：个人收藏分享网站
- 本地项目目录：`C:\Users\lenovo\Documents\Codex\2026-06-26\部署个人收藏分享网站`
- 当前成果目录：`outputs/personal-link-site`
- 主要成果入口：`outputs/personal-link-site/index.html`
- 主要文件：
  - `outputs/personal-link-site/index.html`
  - `outputs/personal-link-site/styles.css`
  - `outputs/personal-link-site/app.js`
  - `outputs/personal-link-site/concept.png`

## GitHub 关联

远程仓库 `origin` 已配置为：

[https://github.com/lqso5226329/personal-bookmark-site](https://github.com/lqso5226329/personal-bookmark-site)

本地分支信息：

- 当前分支：`main`
- `main` 已设置跟踪：`origin/main`
- 检查时本地 `main` 与记录中的 `origin/main` 指向同一提交：
`2c0a97000bad6d89d044d81d34209b19fc14d87c`

备注：

- 系统 PATH 中一开始没有找到 `git` 命令。
- 后续确认 Codex 内置运行环境中有可用 Git：
`C:\Users\lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`



## Netlify 信息

Netlify 账号已连接：

`l451444628@gmail.com`

已创建站点：

`personal-bookmark-site`

Netlify 项目后台：

[https://app.netlify.com/projects/personal-bookmark-site](https://app.netlify.com/projects/personal-bookmark-site)

站点地址：

[https://personal-bookmark-site.netlify.app](https://personal-bookmark-site.netlify.app)

站点 ID：

`ac285958-858b-4527-ad22-b112a7ce9ef6`


## 协作偏好更新

- 关键信息：运行中遇到问题、风险、不确定信息或偏好选择时，Codex 可以主动询问。
- 结论：询问时优先提供 2-3 个清晰方案，并说明每个方案的影响或取舍。
- 相关文件：`AGENTS.md`

## QCR 总表性能诊断

- 文件：`D:\01工作文件\BaiduSyncdisk\2024-05-02尼日利亚项目\1卡卡项目\1.一分部\10.IR-MIR-QCR单\5.QCR单\1.编辑版\QCR单-总表2026.06.25.xlsx`
- 结论：文件约 9.6MB、259 个工作表、约 47,939 个公式单元格；计算模式为手动，但一旦触发计算，公式链较重。
- 主要原因：`QCR-List(总表)` 约 7,944 个公式，其中约 3,850 个 `INDIRECT`；`分类查询(按结构物) (升级版)` 约 4,598 个公式，集中使用 `XLOOKUP/FILTER/UNIQUE/TEXTJOIN/LET` 扫描总表数据。
- 建议：优先把 `INDIRECT` 改为直接引用或结构化表引用；查询结果如非实时必需，可复制为值；编辑期保持手动计算，完成批量修改后再按 `F9` 统一计算。

## QCR 总表性能复查 2026-07-20

- 文件：`D:\01工作文件\BaiduSyncdisk\2024-05-02尼日利亚项目\1卡卡项目\1.一分部\10.IR-MIR-QCR单\5.QCR单\1.编辑版\QCR单-总表2026.07.20.xlsx`
- 结论：约 9.58MB、260 个工作表、约 49,374 个公式；`INDIRECT` 已为 0，说明前期 `INDEX` 和辅助键优化有效。
- 风险：计算模式变为 `autoNoTable`，编辑期建议改回手动；`CELL` 仍约 3,402 个，查询页仍有大量 `XLOOKUP/FILTER/UNIQUE/TEXTJOIN/LET`。
- 下一步：优先改 `分类查询(按结构物) (运行优化版)` 的 LET 公式，先判断特殊结构物，再决定是否执行 `FILTER/TEXTJOIN`；减少单页重复 `CELL("filename")`；已完成的填写数据和单页复制为值。
- 相关报告：`QCR性能诊断-2026-07-20.md`

## 稍后阅读增强

- 线上地址：[https://personal-bookmark-site.netlify.app](https://personal-bookmark-site.netlify.app)
- 已完成：改为云端收藏，新增网页归档、阅读状态、归档阅读入口、原链接入口和备份导出接口。
- 后端：Netlify Functions + Netlify Blobs，接口包括 `/api/bookmarks`、`/api/archive/:id`、`/api/archive-asset`、`/api/backup`。
- GitHub：本次增强已推送到 `main`，提交号 `2d4312b`。
- 验证：线上页面显示“云端同步”，收藏 API 和备份 API 均返回 200；测试收藏 `https://example.com/` 可打开本站归档内容。
- 注意：网页归档为尽力保存；登录、付费、反爬或版权限制页面可能只保存可读正文、原链接和失败原因。

## 备份与失败归档优化

- 已完成：新增完整 ZIP 备份接口 `/api/backup.zip`，备份包包含 `bookmarks.json`、网页归档、可读正文和已保存图片资源。
- 已完成：新增手动补充归档接口 `/api/manual-archive/:id`；抓取失败时可粘贴正文，生成本站可读归档。
- 验证：本地页面加载、导入弹窗打开/取消、前端控制台和全部函数语法检查通过。
- 待办：Netlify MCP 上传代理返回 404，Netlify CLI 无登录凭据；本轮代码已准备好，需后续重新发布线上站点。
