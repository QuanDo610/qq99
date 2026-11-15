# QUY TẮC BẮT BUỘC KHI RENDER TOÁN HỌC TRONG HTML (KATEX)

Khi tạo hoặc chỉnh sửa bất kỳ file HTML nào có chứa công thức toán học (ký hiệu $\times$, $\frac{a}{b}$, $\rightarrow$, $\leftrightarrow$, $\pm$, $\lfloor x \rfloor$, v.v.), **BẮT BUỘC** phải nhúng và cấu hình KaTeX theo chuẩn sau:

## 1. Nhúng KaTeX vào thẻ `<head>`
```html
<!-- KaTeX CSS & JS for LaTeX Math Rendering -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous" onload="renderKatexMath()"></script>
```

## 2. CSS bổ trợ cho KaTeX
```html
<style>
  .katex { font-size: 1.05em; text-rendering: auto; }
  .katex-display {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.35rem 0;
    margin: 0.5rem 0;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }
  td .katex, span .katex { white-space: nowrap; }
</style>
```

## 3. Hàm Auto-render KaTeX trong JavaScript
```javascript
function renderKatexMath(element = document.body) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(element, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false,
      errorColor: '#ef4444',
      strict: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
    });
  }
}

document.addEventListener('DOMContentLoaded', () => renderKatexMath());
window.addEventListener('load', () => renderKatexMath());
```

## 4. Khi cập nhật DOM động bằng JavaScript
Nếu một hàm JavaScript gán `innerHTML` có chứa công thức LaTeX (ví dụ `$ ... $` hoặc `$$ ... $$`), BẮT BUỘC phải gọi lại `renderKatexMath(containerElement)` ngay sau khi gán, hoặc định dạng số liệu rõ ràng kết hợp KaTeX, tuyệt đối không để nguyên văn bản thô `$ ... $` hiện ra trình duyệt của người dùng.
