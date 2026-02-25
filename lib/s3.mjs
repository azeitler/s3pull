import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client(config) {
  return {
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region || "auto",
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true,
    }),
    bucket: config.bucket,
  };
}
