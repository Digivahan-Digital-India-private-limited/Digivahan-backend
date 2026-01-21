const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const generateQRTemplate = async (qrImageUrl, qrNo) => {
  try {
    const CANVAS_WIDTH = 455;
    const CANVAS_HEIGHT = 718;

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // Background template
    const templatePath = path.join(__dirname, "../../assets/template.png");
    const templateImage = await loadImage(templatePath);
    ctx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 🆕 Draw QR number at TOP
    ctx.font = "12px Arial";
    ctx.fillStyle = "#ec9700";
    ctx.textAlign = "center";
    ctx.fillText(`${qrNo}`, CANVAS_WIDTH / 2, 20);

    // QR image
    const qrImage = await loadImage(qrImageUrl);

    const QR_BOX = { x: 118, y: 290, width: 225, height: 225 };
    const QR_SIZE = Math.min(QR_BOX.width, QR_BOX.height);
    const QR_X = QR_BOX.x + (QR_BOX.width - QR_SIZE) / 2;
    const QR_Y = QR_BOX.y + (QR_BOX.height - QR_SIZE) / 2;

    ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

    const fileName = `digivahan_qr_${Date.now()}.png`;
    const outputPath = path.join(__dirname, "../../uploads", fileName);

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("generateQRTemplate error:", error);
    throw error;
  }
};

module.exports = generateQRTemplate;
