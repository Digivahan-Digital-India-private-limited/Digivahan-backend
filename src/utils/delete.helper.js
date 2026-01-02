const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('./s3Client');

const deleteFromS3 = async (key) => {
  const Bucket = process.env.S3_BUCKET_NAME;

  const command = new DeleteObjectCommand({
    Bucket,
    Key: key,
  });

  await s3Client.send(command);

  return true;
};

module.exports = { deleteFromS3 };
