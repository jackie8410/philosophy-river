# 世界哲学与思想者长河

[浏览站点](https://jackie8410.github.io/philosophy-river/) · [GitHub 仓库](https://github.com/jackie8410/philosophy-river) · [验收记录](reports/验收报告.md)

140 位思想者，280 篇 A/B 正文，1120 幅源插图的响应式版本，以及 16 位重点人物的深度阅读页。站点使用 TypeScript 生成静态 HTML，Markdown 渲染关闭原始 HTML。浏览器只负责搜索、筛选、本地书签、进度和可选媒体。

## 本地运行

安装 Node.js 24 或更新版本。仅在从源资料重新导入时需要 Python 3。第一次使用依赖锁安装，之后构建可离线完成。

```sh
npm ci
npm run build
npm run validate
npm run preview
```

终端显示本机访问地址，默认在 `http://127.0.0.1:4173/philosophy-river/`。该预览使用公开构建。浏览器可在人物总览按中文名、原文名或别名检索，也可从时间长河、五条主题和书单进入人物与文章。收藏和进度存于本机浏览器，清除入口在收藏页。

## 导入与受保护预览

资料根目录默认为 `../world-philosophy-series`。目录调整后复制 `.env.example` 为 `.env` 并设置 `SOURCE_DIR`。总表从同目录的 Word 文件读取。辅助拼图、队列、脚本、提示词及原始大图留在资料目录。`.private/import-report.json` 记录源路径、校验和、缺失项、候选变更和全量统计。

```sh
npm run import
npm run assets
npm run dev
```

受保护预览绑定本机回环地址。用本次进程打印的本机访问地址解锁，其他请求返回 401。登录会话只在当前浏览器内有效，重启进程后重新解锁。预览地址仅供本机操作，公开分支从 `content/published.json` 构建。

## 编辑与发布

```sh
npm run editor -- status 005
npm run editor -- diff 005
npm run editor -- patch 005 --file edit.json --actor "实际操作人" --note "变更摘要"
npm run editor -- submit 005 --actor "实际操作人" --note "提交核验"
npm run editor -- review 005 --actor "实际审核人" --note "审核结论"
npm run editor -- publish 005 --actor "实际操作人" --note "发布说明"
npm run assets -- --export-published
npm run build
npm run validate
git add content
git commit -m "Update published reading material"
git push origin main
npm run deploy
```

`edit.json` 的 `fields` 可包含 `name`、`originalName`、`aliases`、`years`、`region`、`tradition`、`overview`、`topics`、`featured` 和 `media`。`articles.A` 或 `articles.B` 可设置 `title`、`body`。永久 ID 和已公开 slug 随版本保留。

批量加入主题用 `editor topic --topic judgment --ids 005,065` 并带实际操作人与摘要。重导入后用 `editor diff 005 --kind A` 查当前源稿和编辑覆盖层。接受全文用 `editor accept-source 005 --kind A`，只接受标题或正文时分别加 `--field title` 或 `--field body`。文章 B 可独立接受。

撤回用 `editor withdraw 005 --actor … --note …`，然后导出公开图片、重建、验收及部署。验证旧路径的 HTTP 状态、站内搜索、推荐和站点地图。Git 历史保留曾经公开的版本，涉及彻底移除的情形由仓库管理员另行处理历史及缓存。

## 配置人物影片

从当前人物的 `media` 复制整条配置，保留封面、说明和比例。在 `content/media/` 放置有使用条件的成片和 WebVTT 字幕，以 `assets/media/文件名.webm` 或 `.mp4` 引用。`video_ready` 需要正数时长、实际权限信息及有效视频路径。外部视频目前只支持明确同意后加载的 YouTube 隐私增强域名。受保护预览可检查播放、字幕、文字稿和错误回退。切回 `placeholder` 恢复封面，`hidden` 隐藏模块。按同一编辑与发布流程部署。

## 备份与恢复

```sh
npm run backup
npm run restore -- backups/备份目录 独立恢复目录
```

备份包含发布快照、响应式图片、本地导入索引、编辑历史、源文件清单和配置示例。恢复目录可以是已取得源码、尚未存放内容数据的目录。恢复后在该目录运行 `npm run build` 和 `npm run preview`。原始大图和文稿继续由资料目录单独备份，实际秘密由操作人保管。

## 部署与广告

Pages 使用 `gh-pages` 分支的根目录。`main` 保存源码、依赖锁和公开内容快照，`gh-pages` 保存可访问产物。`npm run deploy` 验证构建后提交并推送发布分支，查看仓库的 Pages 状态与公开 URL。调整域名时设置新的 `SITE_URL` 并重建，已公开路径应安排迁移。

广告和外部统计默认关闭。真实接入需要独立的广告配置、有效发布商记录、可投放地区及 CMP 信号。准备情况见 [导入与运营记录](reports/导入与运营.md)。
