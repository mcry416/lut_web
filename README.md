# LOOKTABLE

静态 LUT 展示站 / A static LUT gallery. HTML, CSS, JavaScript. GitHub Pages.

中文界面和英文界面可切换。每条 LUT 同时给出中文特点和英文特点。

The UI switches between Chinese and English. Each LUT has a Chinese look note and an English look note.

## 本地预览 / Local preview

```bash
python3 -m http.server 8080
```

打开 / open `http://localhost:8080`

## GitHub Pages

Settings → Pages → 主分支根目录 / main branch, `/` root.

当前资源为富士开源胶片模拟 LUT，以及 Presetpro 创意 LUT。参考预览图为 `assets/ref_wallpaper_scene.jpg`。

Current files are Fujifilm open film-simulation LUTs plus Presetpro creative looks. The preview still is `assets/ref_wallpaper_scene.jpg`.

## 添加 LUT / Add a LUT

1. 把 `.cube` 放到 `assets/luts/`
2. 在 `js/data.js` 增加 `nameZh`、`nameEn`、`summaryZh`、`summaryEn`、`file`
