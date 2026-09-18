# 神月京都物语 · Final Study Edition

这是一个可以直接放到 GitHub Pages 的纯静态日语学习网站。

## 最终范围
- 五十音 46 张基础卡
- 每日学习目标
- 智能复习优先级
- 假名 / 例词日语发音
- 5 题听音辨字
- 卡牌收藏与详情页
- 学习统计
- 日本文化
- 设置
- 桌面与手机响应式

不包含开放世界、GTA 式玩法或大型剧情系统。

## 本地运行
用 VS Code Live Server 打开 `index.html`。

## GitHub Pages
1. GitHub 新建 repository，例如 `KamizukiKyoto`。
2. 把本项目文件全部上传到 repository 根目录。
3. Repository → Settings → Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/ (root)`。
6. 等待部署完成，使用 GitHub 给出的 Pages 地址访问。

本项目全部使用相对路径，因此可以直接部署到：
`https://你的用户名.github.io/KamizukiKyoto/`

## 学习记录
学习记录保存在浏览器 `localStorage`。
同一浏览器会保留；换手机或换电脑不会自动同步。
这是当前版本故意保持简单的设计。

## 现有图片
如果你已经有 `images/ayano.png`，直接保留；不存在时会自动使用 `images/ayano.svg`。
