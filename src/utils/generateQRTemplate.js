const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const generateQRTemplate = async (qrImageUrl) => {
  try {
    // 🔧 Fixed template size
    const CANVAS_WIDTH = 455;
    const CANVAS_HEIGHT = 718;

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // 1️⃣ Load Template Image
    const templatePath = path.join(__dirname, "../../assets/template.png");

    const templateImage = await loadImage(templatePath);
    ctx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2️⃣ Load QR Image from URL (DB value)
    const qrImage = await loadImage(qrImageUrl);

    // 3️⃣ Place QR inside template (AS-IT-IS)
    const QR_BOX = {
      x: 80,
      y: 250,
      width: 300,
      height: 300,
    };

    const QR_SIZE = Math.min(QR_BOX.width, QR_BOX.height);
    const QR_X = QR_BOX.x + (QR_BOX.width - QR_SIZE) / 2;
    const QR_Y = QR_BOX.y + (QR_BOX.height - QR_SIZE) / 2;

    ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

    // 4️⃣ Save Final Image
    const fileName = `digivahan_qr_${Date.now()}.png`;
    const outputPath = path.join(__dirname, "../../uploads", fileName);

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

    // 5️⃣ ✅ RETURN FULL PUBLIC URL (IMPORTANT FIX)
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("generateQRTemplate error:", error);
    throw error;
  }
};

module.exports = generateQRTemplate;
