const QRCode = require("qrcode");

const generateQRCode = async (data) => {
  try {
    // Object → String
    const qrData = JSON.stringify(data);

    // Base64 QR
    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      width: 300,
    });

    return qrImage;
  } catch (error) {
    throw error;
  }
};

module.exports = { generateQRCode };
