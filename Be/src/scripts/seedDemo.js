/**
 * Seed du lieu mau: danh muc, thuong hieu, dung luong/cau hinh, vai tro, trang thai
 * + danh sach san pham mau.
 *
 * Chay:  npm run seed      (sau khi da chay: npx sequelize-cli db:migrate)
 * An toan khi chay nhieu lan: muc nao co roi se khong bi tao lai.
 */
require('dotenv').config();
const db = require('../models');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// 1. DANH SACH CHON (bang Allcodes)
//    type  = nhom (dung cho API /api/get-all-code?type=...)
//    code  = ma luu vao san pham, value = ten hien thi
// ---------------------------------------------------------------
const ALLCODES = [
    // Danh muc
    { type: 'CATEGORY', code: 'CT1', value: 'Laptop' },
    { type: 'CATEGORY', code: 'CT2', value: 'Điện thoại' },
    { type: 'CATEGORY', code: 'CT3', value: 'Máy tính bảng' },
    { type: 'CATEGORY', code: 'CT4', value: 'Đồng hồ thông minh' },
    { type: 'CATEGORY', code: 'CT5', value: 'Tai nghe' },
    { type: 'CATEGORY', code: 'CT6', value: 'Phụ kiện' },

    // Thuong hieu
    { type: 'BRAND', code: 'BR1', value: 'Apple' },
    { type: 'BRAND', code: 'BR2', value: 'Samsung' },
    { type: 'BRAND', code: 'BR3', value: 'Dell' },
    { type: 'BRAND', code: 'BR4', value: 'HP' },
    { type: 'BRAND', code: 'BR5', value: 'Asus' },
    { type: 'BRAND', code: 'BR6', value: 'Lenovo' },
    { type: 'BRAND', code: 'BR7', value: 'Xiaomi' },
    { type: 'BRAND', code: 'BR8', value: 'Sony' },

    // Dung luong / Cau hinh
    { type: 'SIZE', code: 'SZ1', value: '8GB / 256GB' },
    { type: 'SIZE', code: 'SZ2', value: '8GB / 512GB' },
    { type: 'SIZE', code: 'SZ3', value: '16GB / 512GB' },
    { type: 'SIZE', code: 'SZ4', value: '16GB / 1TB' },
    { type: 'SIZE', code: 'SZ5', value: '32GB / 1TB' },
    { type: 'SIZE', code: 'SZ6', value: '64GB' },
    { type: 'SIZE', code: 'SZ7', value: '128GB' },
    { type: 'SIZE', code: 'SZ8', value: '256GB' },
    { type: 'SIZE', code: 'SZ9', value: '512GB' },
    { type: 'SIZE', code: 'SZ10', value: '1TB' },

    // Vai tro (R1, R4 duoc middleware xem la quan tri)
    { type: 'ROLE', code: 'R1', value: 'Quản trị viên' },
    { type: 'ROLE', code: 'R2', value: 'Khách hàng' },
    { type: 'ROLE', code: 'R3', value: 'Người giao hàng' },
    { type: 'ROLE', code: 'R4', value: 'Nhân viên' },

    // Gioi tinh
    { type: 'GENDER', code: 'G1', value: 'Nam' },
    { type: 'GENDER', code: 'G2', value: 'Nữ' },
    { type: 'GENDER', code: 'G3', value: 'Khác' },

    // Trang thai san pham / tai khoan
    { type: 'STATUS', code: 'S1', value: 'Đang hoạt động' },
    { type: 'STATUS', code: 'S2', value: 'Ngừng hoạt động' },

    // Trang thai don hang
    { type: 'STATUS-ORDER', code: 'S3', value: 'Chờ xác nhận' },
    { type: 'STATUS-ORDER', code: 'S4', value: 'Đã xác nhận' },
    { type: 'STATUS-ORDER', code: 'S5', value: 'Đang giao hàng' },
    { type: 'STATUS-ORDER', code: 'S6', value: 'Hoàn thành' },
    { type: 'STATUS-ORDER', code: 'S7', value: 'Đã hủy' },
];

// ---------------------------------------------------------------
// 2. SAN PHAM MAU
//    Moi san pham co 1 hoac nhieu phien ban (variants)
// ---------------------------------------------------------------
const PRODUCTS = [
    {
        name: 'MacBook Air M2', categoryId: 'CT1', brandId: 'BR1', material: 'Nhôm', madeby: 'Trung Quốc',
        desc: 'Laptop mỏng nhẹ, chip Apple M2, pin cả ngày.',
        variants: [
            { nameDetail: 'M2 / Bạc', originalPrice: 26000000, discountPrice: 24500000, sizeId: 'SZ2', weight: '1240', width: '304', height: '215', image: 'macbook-air-m2-1.jpg' },
            { nameDetail: 'M2 / Xám', originalPrice: 30000000, discountPrice: 28500000, sizeId: 'SZ4', weight: '1240', width: '304', height: '215', image: 'macbook-air-m2-2.jpg' },
        ],
    },
    {
        name: 'MacBook Pro 14 M3', categoryId: 'CT1', brandId: 'BR1', material: 'Nhôm', madeby: 'Trung Quốc',
        desc: 'Màn hình Liquid Retina XDR, hiệu năng cao cho dân sáng tạo.',
        variants: [
            { nameDetail: 'M3 / Đen không gian', originalPrice: 42000000, discountPrice: 39900000, sizeId: 'SZ3', weight: '1550', width: '312', height: '221', image: 'macbook-pro-14-m3-1.jpg' },
        ],
    },
    {
        name: 'Dell XPS 13', categoryId: 'CT1', brandId: 'BR3', material: 'Nhôm CNC', madeby: 'Trung Quốc',
        desc: 'Thiết kế viền mỏng, Core i7, màn hình InfinityEdge.',
        variants: [
            { nameDetail: 'Core i5 / Bạc', originalPrice: 28000000, discountPrice: 26500000, sizeId: 'SZ3', weight: '1170', width: '296', height: '199', image: 'dell-xps-13-1.jpg' },
            { nameDetail: 'Core i7 / Bạc', originalPrice: 34000000, discountPrice: 32000000, sizeId: 'SZ4', weight: '1170', width: '296', height: '199', image: 'dell-xps-13-2.jpg' },
        ],
    },
    {
        name: 'HP Pavilion 15', categoryId: 'CT1', brandId: 'BR4', material: 'Nhựa cao cấp', madeby: 'Trung Quốc',
        desc: 'Laptop học tập, văn phòng giá tốt.',
        variants: [
            { nameDetail: 'Core i5 / Đen', originalPrice: 17000000, discountPrice: 15900000, sizeId: 'SZ2', weight: '1750', width: '361', height: '244', image: 'hp-pavilion-15-1.jpg' },
        ],
    },
    {
        name: 'Asus ROG Strix G16', categoryId: 'CT1', brandId: 'BR5', material: 'Nhựa / Kim loại', madeby: 'Trung Quốc',
        desc: 'Laptop gaming RTX, tản nhiệt mạnh, màn 165Hz.',
        variants: [
            { nameDetail: 'Core i7 / RTX 4060', originalPrice: 38000000, discountPrice: 35500000, sizeId: 'SZ4', weight: '2500', width: '354', height: '264', image: 'asus-rog-strix-g16-1.jpg' },
        ],
    },
    {
        name: 'Lenovo ThinkPad X1 Carbon', categoryId: 'CT1', brandId: 'BR6', material: 'Sợi carbon', madeby: 'Trung Quốc',
        desc: 'Laptop doanh nhân siêu nhẹ, bàn phím tốt nhất phân khúc.',
        variants: [
            { nameDetail: 'Core i7 / Đen', originalPrice: 45000000, discountPrice: 42000000, sizeId: 'SZ5', weight: '1120', width: '315', height: '222', image: 'lenovo-thinkpad-x1-carbon-1.jpg' },
        ],
    },
    {
        name: 'iPhone 15 Pro', categoryId: 'CT2', brandId: 'BR1', material: 'Titan', madeby: 'Trung Quốc',
        desc: 'Khung titan, chip A17 Pro, cổng USB-C.',
        variants: [
            { nameDetail: 'Titan tự nhiên', originalPrice: 28000000, discountPrice: 26500000, sizeId: 'SZ8', weight: '187', width: '71', height: '147', image: 'iphone-15-pro-1.jpg' },
            { nameDetail: 'Titan xanh', originalPrice: 32000000, discountPrice: 30500000, sizeId: 'SZ9', weight: '187', width: '71', height: '147', image: 'iphone-15-pro-2.jpg' },
        ],
    },
    {
        name: 'Samsung Galaxy S24 Ultra', categoryId: 'CT2', brandId: 'BR2', material: 'Titan', madeby: 'Việt Nam',
        desc: 'Camera 200MP, bút S Pen, màn hình Dynamic AMOLED 2X.',
        variants: [
            { nameDetail: 'Đen titan', originalPrice: 31000000, discountPrice: 28900000, sizeId: 'SZ8', weight: '232', width: '79', height: '162', image: 'samsung-galaxy-s24-ultra-1.jpg' },
            { nameDetail: 'Xám titan', originalPrice: 35000000, discountPrice: 32900000, sizeId: 'SZ9', weight: '232', width: '79', height: '162', image: 'samsung-galaxy-s24-ultra-2.jpg' },
        ],
    },
    {
        name: 'Xiaomi 14', categoryId: 'CT2', brandId: 'BR7', material: 'Nhôm / Kính', madeby: 'Trung Quốc',
        desc: 'Camera Leica, Snapdragon 8 Gen 3, sạc nhanh 90W.',
        variants: [
            { nameDetail: 'Đen', originalPrice: 21000000, discountPrice: 19500000, sizeId: 'SZ8', weight: '193', width: '72', height: '152', image: 'xiaomi-14-1.jpg' },
        ],
    },
    {
        name: 'iPad Air M2', categoryId: 'CT3', brandId: 'BR1', material: 'Nhôm', madeby: 'Trung Quốc',
        desc: 'Máy tính bảng chip M2, hỗ trợ Apple Pencil Pro.',
        variants: [
            { nameDetail: 'Xanh / Wi-Fi', originalPrice: 16500000, discountPrice: 15500000, sizeId: 'SZ7', weight: '462', width: '179', height: '247', image: 'ipad-air-m2-1.jpg' },
            { nameDetail: 'Xanh / Wi-Fi', originalPrice: 19500000, discountPrice: 18500000, sizeId: 'SZ8', weight: '462', width: '179', height: '247', image: 'ipad-air-m2-2.jpg' },
        ],
    },
    {
        name: 'Samsung Galaxy Tab S9', categoryId: 'CT3', brandId: 'BR2', material: 'Nhôm', madeby: 'Việt Nam',
        desc: 'Màn hình AMOLED 11 inch, chống nước IP68.',
        variants: [
            { nameDetail: 'Xám', originalPrice: 20000000, discountPrice: 18500000, sizeId: 'SZ8', weight: '498', width: '165', height: '254', image: 'samsung-galaxy-tab-s9-1.jpg' },
        ],
    },
    {
        name: 'Apple Watch Series 9', categoryId: 'CT4', brandId: 'BR1', material: 'Nhôm', madeby: 'Trung Quốc',
        desc: 'Chip S9, màn hình sáng gấp đôi, theo dõi sức khỏe.',
        variants: [
            { nameDetail: '45mm / Đen', originalPrice: 11000000, discountPrice: 10200000, sizeId: 'SZ6', weight: '39', width: '38', height: '45', image: 'apple-watch-series-9-1.jpg' },
        ],
    },
    {
        name: 'Sony WH-1000XM5', categoryId: 'CT5', brandId: 'BR8', material: 'Nhựa / Da PU', madeby: 'Malaysia',
        desc: 'Tai nghe chống ồn hàng đầu, pin 30 giờ.',
        variants: [
            { nameDetail: 'Đen', originalPrice: 9000000, discountPrice: 7990000, sizeId: null, weight: '250', width: '', height: '', image: 'sony-wh-1000xm5-1.jpg' },
            { nameDetail: 'Bạc', originalPrice: 9000000, discountPrice: 7990000, sizeId: null, weight: '250', width: '', height: '', image: 'sony-wh-1000xm5-2.jpg' },
        ],
    },
];

// Anh minh hoa don gian (SVG data URL) de trang admin co anh hien thi
function placeholderImage(text, seed) {
    const colors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];
    const color = colors[seed % colors.length];
    const label = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
        '<rect width="100%" height="100%" fill="' + color + '"/>' +
        '<text x="50%" y="50%" fill="#ffffff" font-family="Arial" font-size="28" ' +
        'text-anchor="middle" dominant-baseline="middle">' + label + '</text></svg>';
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// Doc anh tu thu muc src/scripts/images/. Khong co file thi dung anh mau.
function loadImage(file, fallbackText, seed) {
    if (file) {
        const full = path.join(__dirname, 'images', file);
        if (fs.existsSync(full)) {
            let ext = path.extname(file).slice(1).toLowerCase();
            if (ext === 'jpg') ext = 'jpeg';
            return `data:image/${ext};base64,` + fs.readFileSync(full).toString('base64');
        }
    }
    return placeholderImage(fallbackText, seed);
}

async function seedAllcodes() {
    let created = 0;
    for (const item of ALLCODES) {
        const exists = await db.Allcode.findOne({ where: { code: item.code } });
        if (!exists) {
            await db.Allcode.create(item);
            created++;
        }
    }
    console.log(`Allcode: them ${created} muc moi (tong ${ALLCODES.length}).`);
}

async function seedProducts() {
    let created = 0;
    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const exists = await db.Product.findOne({ where: { name: p.name } });
        if (exists) continue;

        const product = await db.Product.create({
            name: p.name,
            contentHTML: `<p>${p.desc}</p>`,
            contentMarkdown: p.desc,
            statusId: 'S1',
            categoryId: p.categoryId,
            brandId: p.brandId,
            material: p.material,
            madeby: p.madeby,
            view: 0,
        });

        for (const v of p.variants) {
            const detail = await db.ProductDetail.create({
                productId: product.id,
                nameDetail: v.nameDetail,
                originalPrice: v.originalPrice,
                discountPrice: v.discountPrice,
                description: p.desc,
            });
            await db.ProductImage.create({
                productdetailId: detail.id,
                caption: p.name,
                image: loadImage(v.image, p.name, i),
            });
            await db.ProductDetailSize.create({
                productdetailId: detail.id,
                sizeId: v.sizeId,
                width: v.width,
                height: v.height,
                weight: v.weight,
            });
        }
        created++;
    }
    console.log(`San pham: them ${created} san pham moi (tong ${PRODUCTS.length}).`);
}

// Ton kho = tong so luong trong phieu nhap - so luong da dat.
// Neu khong co phieu nhap thi san pham hien "(het)" va khong the them vao gio.
async function seedStock() {
    const sizes = await db.ProductDetailSize.findAll({ raw: true });
    const missing = [];
    for (const s of sizes) {
        const has = await db.ReceiptDetail.findOne({ where: { productDetailSizeId: s.id } });
        if (!has) missing.push(s);
    }
    if (missing.length === 0) {
        console.log('Kho: tat ca san pham da co ton kho.');
        return;
    }

    let supplier = await db.Supplier.findOne({ where: { name: 'Nhà cung cấp mẫu' } });
    if (!supplier) {
        supplier = await db.Supplier.create({
            name: 'Nhà cung cấp mẫu',
            address: 'TP. Hồ Chí Minh',
            phonenumber: '0900000000',
            email: 'supplier@example.com',
        });
    }
    const admin = await db.User.findOne({ where: { roleId: 'R1' } });
    const receipt = await db.Receipt.create({
        userId: admin ? admin.id : null,
        supplierId: supplier.id,
    });

    for (const s of missing) {
        await db.ReceiptDetail.create({
            receiptId: receipt.id,
            productDetailSizeId: s.id,
            quantity: 50,
            price: 0,
        });
    }
    console.log(`Kho: nhap ${missing.length} muc, moi muc 50 san pham.`);
}

(async () => {
    try {
        await db.sequelize.authenticate();
        await seedAllcodes();
        await seedProducts();
        await seedStock();
        console.log('Seed xong!');
        process.exit(0);
    } catch (error) {
        console.error('Seed loi:', error.message);
        if (/no such table|doesn't exist/i.test(error.message)) {
            console.error('=> Chua co bang. Hay chay truoc: npx sequelize-cli db:migrate');
        }
        process.exit(1);
    }
})();
