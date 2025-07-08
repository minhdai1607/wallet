# Wallet Generator

Ứng dụng web để tạo và quản lý private key cho ví tiền điện tử với giao diện hiện đại và dễ sử dụng.

## Tính năng chính

### 🗝️ Generate Private Key (Trang chính)
- **3 phương pháp tạo private key:**
  1. **Xáo trộn Private Key**: Tạo private key mới từ private key có sẵn bằng cách xáo trộn
  2. **Seed Phrase**: Tạo từ seed phrase 12 hoặc 24 từ (tự động tạo nếu không nhập)
  3. **Random Range**: Tạo từ khoảng số ngẫu nhiên

- **Cấu hình tạo:**
  - Số lượng worker (mặc định: 2)
  - Số lượng private key cần tạo (mặc định: 10,000)
  - Progress bar với thời gian ước tính
  - Tự động lưu file `wallet_datetime.txt`

### 📁 Management
- Xem danh sách tất cả wallet đã tạo
- Tìm kiếm và lọc theo address hoặc private key
- Chỉnh sửa thông tin wallet
- Xóa wallet không cần thiết
- Upload file wallet từ máy tính
- Download file wallet về máy

### ⚙️ RPC Management
- Thêm, sửa, xóa RPC endpoints
- Hỗ trợ nhiều blockchain: Ethereum, BNB, Polygon, Base, Optimism, Arbitrum, Avalanche, Fantom
- Test kết nối RPC
- Quản lý tên và URL cho từng RPC

## Cài đặt và chạy

### Yêu cầu
- Node.js 16+ 
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Chạy development server
```bash
npm run dev
```

### Build cho production
```bash
npm run build
```

### Preview build
```bash
npm run preview
```

## Cấu trúc dự án

```
src/
├── components/          # React components
│   └── Navigation.tsx   # Navigation bar
├── pages/              # Page components
│   ├── GeneratePage.tsx    # Trang tạo private key
│   ├── ManagementPage.tsx  # Trang quản lý wallet
│   └── RpcManagementPage.tsx # Trang quản lý RPC
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   ├── walletUtils.ts  # Wallet generation utilities
│   └── storage.ts      # Local storage utilities
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Công nghệ sử dụng

- **React 18** với TypeScript
- **Vite** - Build tool nhanh
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing
- **Ethers.js** - Ethereum library
- **Lucide React** - Icon library

## Deploy lên Netlify

1. Build project:
```bash
npm run build
```

2. Upload thư mục `dist` lên Netlify hoặc connect GitHub repository

3. Cấu hình build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Lưu ý bảo mật

- Tất cả dữ liệu được lưu trong localStorage của trình duyệt
- Private key và seed phrase không được gửi lên server
- Ứng dụng hoạt động hoàn toàn ở client-side
- Nên sử dụng trong môi trường an toàn

## Hỗ trợ

Nếu cần thêm tính năng hoặc gặp vấn đề, vui lòng tạo issue hoặc liên hệ.

## License

MIT License 