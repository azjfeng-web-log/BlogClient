# ffmpeg.wasm 接入指南（Vite + React + TypeScript）

## 1. 安装依赖

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

## 2. Vite 配置

`vite.config.ts` 需要两处修改：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // 1. 排除预构建，避免破坏 worker 文件
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    port: 3000,
    // 2. SharedArrayBuffer 需要这两个响应头（多线程版本必须，单线程版本也建议加上）
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:6000',
        changeOrigin: true
      }
    }
  }
})
```

> **关键点**：Vite 使用 ESM 模块，CDN 路径必须用 `dist/esm`，不能用 `dist/umd`。

## 3. 核心用法

### 3.1 加载 FFmpeg

```ts
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()

// Vite 必须使用 esm 版本
const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
})
```

### 3.2 多线程版本加载

```ts
// 使用 core-mt 多线程包（需要 COOP/COEP 响应头）
const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm'

await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
})
```

### 3.3 事件监听

```ts
// 日志
ffmpeg.on('log', ({ message }) => {
  console.log('[FFmpeg]', message)
})

// 进度（实验性功能，部分场景可能不准）
ffmpeg.on('progress', ({ progress, time }) => {
  console.log(`${(progress * 100).toFixed(1)}% (已处理: ${time / 1000000}s)`)
})
```

## 4. 常用操作示例

### 4.1 视频转码（WebM → MP4）

```ts
await ffmpeg.writeFile('input.webm', await fetchFile(videoFile))
await ffmpeg.exec(['-i', 'input.webm', 'output.mp4'])
const data = await ffmpeg.readFile('output.mp4')
const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
```

### 4.2 带超时的转码

```ts
// 第二个参数为超时毫秒数，超时后自动停止
await ffmpeg.exec(['-i', 'input.webm', 'output.mp4'], 10000)
```

### 4.3 视频分割为等时长片段

```ts
await ffmpeg.writeFile('input.webm', await fetchFile(videoFile))
await ffmpeg.exec([
  '-i', 'input.webm',
  '-f', 'segment',
  '-segment_time', '3',        // 每段 3 秒
  '-g', '9',
  '-sc_threshold', '0',
  '-force_key_frames', 'expr:gte(t,n_forced*9)',
  '-reset_timestamps', '1',
  '-map', '0',
  'output_%d.mp4'              // output_0.mp4, output_1.mp4, ...
])

const segment = await ffmpeg.readFile('output_0.mp4')
```

### 4.4 视频裁剪（指定时间段）

```ts
await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
await ffmpeg.exec([
  '-i', 'input.mp4',
  '-ss', '00:00:05',     // 开始时间
  '-to', '00:00:15',     // 结束时间
  '-c', 'copy',          // 不重新编码，速度快
  'output.mp4'
])
const data = await ffmpeg.readFile('output.mp4')
```

### 4.5 视频叠加文字

```ts
await ffmpeg.writeFile('input.webm', await fetchFile(videoFile))
await ffmpeg.writeFile('arial.ttf', await fetchFile('/fonts/arial.ttf'))

await ffmpeg.exec([
  '-i', 'input.webm',
  '-vf', "drawtext=fontfile=/arial.ttf:text='Hello':x=10:y=10:fontsize=24:fontcolor=white",
  'output.mp4',
])
```

### 4.6 提取音频

```ts
await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-acodec', 'libmp3lame', 'output.mp3'])
const data = await ffmpeg.readFile('output.mp3')
```

### 4.7 混合两个视频

```ts
await ffmpeg.writeFile('video1.webm', await fetchFile(file1))
await ffmpeg.writeFile('video2.webm', await fetchFile(file2))

await ffmpeg.exec([
  '-i', 'video1.webm',
  '-i', 'video2.webm',
  '-filter_complex', "[0:v][1:v]blend=all_expr='A*(if(eq(0,N/2),1,T))+B*(if(eq(0,N/2),T,1))'",
  'output.mp4',
])
```

## 5. React Hook 封装参考

```tsx
import { useRef, useState, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const load = useCallback(async () => {
    if (loaded || loading) return
    setLoading(true)
    try {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message))

      // Vite 必须用 esm
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpegRef.current = ffmpeg
      setLoaded(true)
    } catch (err) {
      console.error('FFmpeg load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [loaded, loading])

  return { ffmpeg: ffmpegRef, loaded, loading, progress, load }
}
```

## 6. 高级功能

### 6.1 AbortController 中止任务

> 需要 `@ffmpeg/ffmpeg@0.12.10+`、`@ffmpeg/core@0.12.4+`

```ts
const controller = new AbortController()
const { signal } = controller

// 传入 signal
await ffmpeg.exec(['-i', 'input.webm', 'output.mp4'], -1, { signal })

// 需要中止时
controller.abort()
```

### 6.2 WORKERFS 支持

> 需要 `@ffmpeg/ffmpeg@0.12.10+`、`@ffmpeg/core@0.12.4+`

允许更高效地挂载文件系统，适合处理大文件场景。详见 [PR #581](https://github.com/ffmpegwasm/ffmpeg.wasm/pull/581)。

## 7. 注意事项

| 项目 | 说明 |
|------|------|
| **Vite 必须用 ESM** | CDN 路径用 `dist/esm`，不能用 `dist/umd` |
| **COOP/COEP 响应头** | `SharedArrayBuffer` 需要，多线程版本必须配置 |
| **optimizeDeps.exclude** | Vite 必须排除 `@ffmpeg/ffmpeg` 和 `@ffmpeg/util` 的预构建 |
| **toBlobURL** | 用于解决 CORS 问题，将远程文件转为 Blob URL 加载 |
| **progress 事件** | 实验性功能，合并视频、图片转换等场景可能不准 |
| **浏览器兼容** | 需要支持 WebAssembly 和 Web Worker 的现代浏览器 |
| **文件大小限制** | wasm 内存有限，超大文件可能 OOM |
