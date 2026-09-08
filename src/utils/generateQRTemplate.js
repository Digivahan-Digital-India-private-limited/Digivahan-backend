const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const NEW_TEMPLATE_PATH = path.join(__dirname, "../../assets/image (44).png");

const DEFAULT_CONFIG = {
  canvasWidth: 1536,
  canvasHeight: 1024,
  templatePath: NEW_TEMPLATE_PATH,
  qrBox: {
    x: 895,
    y: 217,
    width: 520,
    height: 520,
  },
};

const TEMPLATE_CONFIG = {
  car: { ...DEFAULT_CONFIG },
  bike: { ...DEFAULT_CONFIG },
  default: { ...DEFAULT_CONFIG },
};

const generateQRTemplate = async (qrImageUrl, qrNo, type = "car") => {
  try {
    const config = TEMPLATE_CONFIG[type] || TEMPLATE_CONFIG.car || DEFAULT_CONFIG;

    const canvas = createCanvas(config.canvasWidth, config.canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background template
    const templateImage = await loadImage(config.templatePath);
    ctx.drawImage(templateImage, 0, 0, config.canvasWidth, config.canvasHeight);

    // QR image
    const qrImage = await loadImage(qrImageUrl);

    const { x, y, width, height } = config.qrBox;
    const QR_SIZE = Math.min(width, height);
    const QR_X = x + (width - QR_SIZE) / 2;
    const QR_Y = y + (height - QR_SIZE) / 2;

    ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `digivahan_qr_${type}_${Date.now()}.png`;
    const outputPath = path.join(uploadsDir, fileName);

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("generateQRTemplate error:", error);
    throw error;
  }
};

module.exports = generateQRTemplate;
