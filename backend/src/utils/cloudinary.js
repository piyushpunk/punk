import {v2 as cloudinary} from "cloudinary"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = (file, folder = "akuma/products") => {
  if (!file?.buffer?.length) return Promise.resolve(null);

  return new Promise((resolve) => {
    let stream;
    try {
      stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder },
        (error, result) => {
          if (error) {
            // The detailed provider error stays in Railway logs; callers receive
            // a safe, actionable response instead of an opaque 500.
            console.error("[cloudinary] upload failed:", error.message || error);
            resolve(null);
            return;
          }
          resolve(result);
        }
      );
    } catch (err) {
      // Missing/invalid credentials throw SYNCHRONOUSLY inside upload_stream —
      // degrade the same way as an async failure (callers turn null into a
      // clean 502) instead of letting it bubble as an opaque 500.
      console.error("[cloudinary] upload failed:", err?.message || err);
      resolve(null);
      return;
    }
    stream.end(file.buffer);
  });
};



export {uploadOnCloudinary}
