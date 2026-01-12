const QRCode = require("qrcode");

const generateQRCode = async (data) => {
  try {
   
    // Base64 QR
    const qrImage = await QRCode.toDataURL(data, {
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
