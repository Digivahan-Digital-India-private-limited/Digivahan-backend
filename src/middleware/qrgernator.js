const QRCode = require("qrcode");

const generateQRCode = async (data) => {
  try {
    // Returns a raw PNG Buffer — compatible with Cloudinary upload_stream
    const qrBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: "H",
      type: "png",
      margin: 2,
      width: 300,
    });

    return qrBuffer;
  } catch (error) {
    throw error;
  }
};

module.exports = { generateQRCode };
