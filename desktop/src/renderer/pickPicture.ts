import {
  PICTURE_STEPS,
  THUMB_SIZE,
  THUMB_QUALITY,
  fitPixels,
  fitSize,
  writablePicture,
  type NewPicture,
} from "@/lib/entryPicture";

/** Controller image rules, using DOM encoders instead of Expo image manipulation. */
export async function preparePicture(file: File): Promise<NewPicture> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type))
    throw new Error("Choose a JPEG, PNG or WebP picture.");
  const bitmap = await createImageBitmap(file);
  function encode(width: number, quality: number, format: 'jpeg' | 'png' = 'jpeg') {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(
      1,
      Math.round((width * bitmap.height) / bitmap.width),
    );
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image encoder unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      data: canvas.toDataURL(`image/${format}`, quality),
      width: canvas.width,
      height: canvas.height,
    };
  }
  try {
    const fitted = fitSize(bitmap.width, bitmap.height, THUMB_SIZE);
    const thumbWidth =
      fitted && "width" in fitted
        ? fitted.width
        : fitted && "height" in fitted
          ? Math.round((fitted.height * bitmap.width) / bitmap.height)
          : bitmap.width;
    const thumb = encode(thumbWidth, THUMB_QUALITY).data;
    for (const step of PICTURE_STEPS) {
      const size = fitPixels(bitmap.width, bitmap.height, step.pixels);
      const picture = {
        ...encode(size?.width ?? bitmap.width, step.quality, step.format),
        thumb,
      };
      if (writablePicture(picture)) return picture;
    }
    throw new Error("That picture is too big to keep. Choose a smaller crop.");
  } finally {
    bitmap.close();
  }
}
