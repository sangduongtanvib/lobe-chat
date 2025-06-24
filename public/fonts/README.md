# Offline Fonts Setup for Lobe Chat

Đây là giải pháp để sử dụng Lobe Chat trong môi trường offline (VM bị chặn internet).

## 🎯 Các tài nguyên đã được tải về

1. **Hack** - Font monospace cho code
2. **HarmonyOS Sans** - Font chính cho giao diện (đầy đủ Light, Regular, Medium, Bold)
3. **HarmonyOS Sans SC** - Font tiếng Trung giản thể (đầy đủ Light, Regular, Medium, Bold)
4. **KaTeX** - CSS cho hiển thị công thức toán học
5. **Animated Emojis** - Emoji animated (waving hand: 1f44b.webp)

## 📁 Cấu trúc thư mục

```
public/fonts/
├── offline-fonts.css          # File CSS tổng hợp
├── webfont-mono.css          # CSS cho Hack font
├── Hack_*.woff*              # Hack font files
├── harmony-sans/
│   ├── index.css
│   └── HarmonyOS_Sans_*.woff*
├── harmony-sans-sc/
│   ├── index.css
│   └── HarmonyOS_Sans_SC_*.woff*
└── katex/
    └── katex.min.css

public/emojis/
└── 1f44b.webp               # Waving hand animated emoji
```

## ⚙️ Cấu hình

File `.env.local` đã được cấu hình:

```bash
# Offline font configuration
CUSTOM_FONT_URL=/fonts/offline-fonts.css
CUSTOM_FONT_FAMILY=HarmonyOS Sans
CDN_USE_GLOBAL=0
```

## 🚀 Cách sử dụng

1. **Chạy ứng dụng offline:**
   ```bash
   npm run dev
   ```

2. **Revert về online fonts:**
   Xóa hoặc comment các dòng font config trong `.env.local`

3. **Tự động setup lại:**
   ```bash
   ./scripts/setup-offline-fonts.sh
   ```

## 🔧 Troubleshooting

- **Font không load:** Kiểm tra xem các file font có tồn tại trong `public/fonts/`
- **Vẫn có request ra ngoài:** Đảm bảo `CDN_USE_GLOBAL=0` trong `.env.local`
- **Font fallback:** Component `OfflineFontFallback` sẽ tự động sử dụng system fonts nếu cần

## 📝 URLs gốc đã được tải về

- `https://registry.npmmirror.com/@lobehub/webfont-mono/latest/files/css/index.css`
- `https://registry.npmmirror.com/@lobehub/webfont-harmony-sans/latest/files/css/index.css`
- `https://registry.npmmirror.com/@lobehub/webfont-harmony-sans-sc/latest/files/css/index.css`
- `https://registry.npmmirror.com/katex/latest/files/dist/katex.min.css`
- `https://registry.npmmirror.com/@lobehub/fluent-emoji-anim-1/1.0.0/files/assets/1f44b.webp`
