# Hand gesture drawing app

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/carlxus-projects/v0-hand-gesture-drawing-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/m8nE07FwGYC)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/carlxus-projects/v0-hand-gesture-drawing-app](https://vercel.com/carlxus-projects/v0-hand-gesture-drawing-app)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/m8nE07FwGYC](https://v0.app/chat/projects/m8nE07FwGYC)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

---

## Features

- Hand-gesture drawing powered by webcam (open palm to move cursor, pinch to draw)
- Traditional drawing tools: brush, pen, marker, highlighter, eraser, bucket fill, eyedropper, text
- Shape Library: stick figures, basic shapes, symbols, objects
- Layers and basic animation timeline (play/pause, frame slider)
- Undo/Redo, clear canvas, zoom in/out, reset zoom
- Import image to canvas and export as PNG
- Multilingual UI (English, 中文, Español)
- Keyboard shortcuts (B: Brush, E: Eraser, F: Fill, I: Eyedropper, T: Text, Space: Pan, Ctrl+Z/Y)

## Highlights

- Canvas engine with smooth paths (quadratic Bézier) and offscreen rendering for performance
- Gesture-processing loop with throttling for stable tracking
- Modular components and CustomEvent-based communication between panels and canvas
- Responsive UI with shadcn/ui + Radix primitives, Tailwind CSS styling

## Gesture Usage (Palm Drawing)

- Open Palm: move the virtual cursor
- Pinch (Thumb + Index): start/continue drawing
- Release Pinch: stop drawing

If camera permission is denied, the app shows an inline alert. For best accuracy, keep your palm facing the camera with good lighting.

## 快速上手（中文）

- 启用摄像头后，张开手掌移动光标；拇指与食指捏合开始落笔，松开则提笔。
- 支持常用绘图工具、形状库、图层与动画时间轴、导入导出等功能。
- 通过右上角可切换语言与面板，使用快捷键提升效率。