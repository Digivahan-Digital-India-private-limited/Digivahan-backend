const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('./s3Client');

const uploadToS3 = async ({ buffer, mimetype, key }) => {
  const Bucket = process.env.S3_BUCKET_NAME;

  // 1️⃣ Upload command
  const uploadCommand = new PutObjectCommand({
    Bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  });

  await s3Client.send(uploadCommand);

  // 2️⃣ Get command (for URL)
  const getCommand = new GetObjectCommand({
    Bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, getCommand, {
    expiresIn: Number(process.env.S3_URL_EXPIRY_SECONDS || 3600),
  });

  return url;
};

module.exports = { uploadToS3 };
