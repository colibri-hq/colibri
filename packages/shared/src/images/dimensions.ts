export async function getImageDimensions(image: string | ArrayBuffer): Promise<{
  width: number;
  height: number;
}> {
  if (typeof image === 'string') {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.src = image;

      img.addEventListener('error', (error) => reject(error));
      img.addEventListener('load', () =>
        resolve({
          width: img.width,
          height: img.height,
        }),
      );
    });
  }

  const { width, height } = await createImageBitmap(new Blob([image]), {});

  return { width, height };
}
