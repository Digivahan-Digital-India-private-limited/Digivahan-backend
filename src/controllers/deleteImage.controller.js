const { deleteFromS3 } = require('../utils/delete.helper');

const deleteImage = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Image key is required',
      });
    }

    await deleteFromS3(key);

    return res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Image delete failed',
    });
  }
};

module.exports = { deleteImage };
