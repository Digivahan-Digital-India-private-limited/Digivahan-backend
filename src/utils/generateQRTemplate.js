const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const TEMPLATE_CONFIG = {
  car: {
    canvasWidth: 455,
    canvasHeight: 718,
    templatePath: path.join(__dirname, "../../assets/template.png"),
    qrBox: {
      x: 118,
      y: 290,
      width: 225,
      height: 225,
    },
  },

  bike: {
    canvasWidth: 356,
    canvasHeight: 455, // ✅ updated as requested
    templatePath: path.join(__dirname, "../../assets/bike_template.png"),
    qrBox: {
      x: 43,
      y: 100,
      width: 270,
      height: 270,
    },
  },
};

const generateQRTemplate = async (qrImageUrl, qrNo, type = "car") => {
  try {
    const config = TEMPLATE_CONFIG[type] || TEMPLATE_CONFIG.car;

    const canvas = createCanvas(config.canvasWidth, config.canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background template
    const templateImage = await loadImage(config.templatePath);
    ctx.drawImage(templateImage, 0, 0, config.canvasWidth, config.canvasHeight);

    // QR number
    ctx.font = "12px Arial";
    ctx.fillStyle = "#ec9700";
    ctx.textAlign = "center";
    ctx.fillText(`${qrNo}`, config.canvasWidth / 2, 15);

    // QR image
    const qrImage = await loadImage(qrImageUrl);

    const { x, y, width, height } = config.qrBox;
    const QR_SIZE = Math.min(width, height);
    const QR_X = x + (width - QR_SIZE) / 2;
    const QR_Y = y + (height - QR_SIZE) / 2;

    ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

    const fileName = `digivahan_qr_${type}_${Date.now()}.png`;
    const outputPath = path.join(__dirname, "../../uploads", fileName);

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("generateQRTemplate error:", error);
    throw error;
  }
};

module.exports = generateQRTemplate;
