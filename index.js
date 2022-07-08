// dependencies
const AWS = require("aws-sdk");
const util = require("util");
const sharp = require("sharp");

// get reference to S3 client
const s3 = new AWS.S3({
  region: "us-east-1",
  accessKeyId: "AKIA2UG7D5EPCSPKMPMB",
  secretAccessKey: "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",
  signatureVersion: "v4",
});
const destinationBucket = `due-dilly-mobile-thumbnail-dev`;
const THUMB_WIDTH = 600;
const THUMB_HEIGHT = 600;

exports.handler = async (event, context) => {
  // Read options from the event parameter.
  console.log(
    "Reading options from event:\n",
    util.inspect(event, { depth: 5 })
  );
  const srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  const dstKey = "thumbnails/" + srcKey;

  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "png" && imageType != "jpg" && imageType != "jpeg") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  // Download the image from the S3 source bucket.

  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    var origimage = await s3.getObject(params).promise();
  } catch (error) {
    console.log("Error while downloading");
    console.log(error);
    return;
  }

  // set thumbnail width.

  const imgMetadata = await sharp(origimage).metadata();
  const scalingFactor = Math.min(
      1,
      THUMB_WIDTH / imgMetadata.width,
      THUMB_HEIGHT / imgMetadata.height
    ),
    width = scalingFactor * imgMetadata.width,
    height = scalingFactor * imgMetadata.height;
  // Use the Sharp module to resize the image and save in a buffer.
  try {
    var buffer = await sharp(origimage.Body)
      .resize({ width, height })
      .toBuffer();
  } catch (error) {
    console.log(error);
    return;
  }

  // Upload the thumbnail image to the destination bucket
  try {
    const destparams = {
      Bucket: destinationBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: "image",
    };
    await s3.putObject(destparams).promise();
  } catch (error) {
    console.log(error);
    return;
  }

  console.log(
    "Successfully resized " +
      srcBucket +
      "/" +
      srcKey +
      " and uploaded to " +
      "thumbnail/" +
      dstKey
  );
  context.done();
};
