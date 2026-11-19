# Mihkoa-tech - giao diện web cho backend ecomapi

1. Chạy backend (`npm start` trong folder backend, mặc định cổng 8003).
2. Nếu backend không ở cổng 8003, sửa `config.js`.
3. Mở thư mục này bằng VS Code, chuột phải `index.html` → "Open with Live Server" (hoặc `npx http-server .`).
   - `index.html`: cửa hàng cho khách.
   - `admin.html`: trang quản trị.
4. Lần đầu (database trống):
   - Vào `admin.html` → "Tạo admin đầu tiên" → đăng nhập.
   - Vào "Khởi tạo dữ liệu" → bấm "Tạo dữ liệu mẫu" (danh mục, thương hiệu, size, trạng thái, vận chuyển...).
   - Thêm nhà cung cấp → thêm sản phẩm → vào "Phiên bản/Kho" → "Nhập kho" để có hàng bán.
