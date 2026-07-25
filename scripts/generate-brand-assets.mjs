import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectRoot, "assets", "brand");

const sourcePaths = {
  mark: path.join(sourceDirectory, "nexrun-logo-no-text-source.png"),
  lockup: path.join(sourceDirectory, "nexrun-logo-source.png"),
  wordmark: path.join(sourceDirectory, "nexrun-text-only-source.png"),
};

function toDataUrl(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function createIco(images) {
  const directorySize = 6 + images.length * 16;
  const header = Buffer.alloc(directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let imageOffset = directorySize;
  images.forEach(({ size, buffer }, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += buffer.length;
  });

  return Buffer.concat([header, ...images.map(({ buffer }) => buffer)]);
}

const sourceDataUrls = Object.fromEntries(
  await Promise.all(
    Object.entries(sourcePaths).map(async ([key, sourcePath]) => [key, toDataUrl(await readFile(sourcePath))])
  )
);

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const generated = await page.evaluate(async (sources) => {
    function loadImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to decode a NexRun brand source image."));
        image.src = source;
      });
    }

    function canvas(width, height) {
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      return output;
    }

    function cleanAndCrop(image, { maximumY = image.naturalHeight - 1, padding = 24 } = {}) {
      const source = canvas(image.naturalWidth, image.naturalHeight);
      const sourceContext = source.getContext("2d", { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0);
      const pixels = sourceContext.getImageData(0, 0, source.width, source.height);
      const { data } = pixels;

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha === 0) continue;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const minimum = Math.min(red, green, blue);
        const maximum = Math.max(red, green, blue);

        // Remove the white matte left by the original background extraction.
        if (minimum > 225 && maximum - minimum < 35) {
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = 0;
          continue;
        }

        // Recover the foreground colour for partially transparent antialiased pixels.
        if (alpha < 255) {
          const ratio = alpha / 255;
          data[index] = Math.max(0, Math.min(255, Math.round((red - 255 * (1 - ratio)) / ratio)));
          data[index + 1] = Math.max(0, Math.min(255, Math.round((green - 255 * (1 - ratio)) / ratio)));
          data[index + 2] = Math.max(0, Math.min(255, Math.round((blue - 255 * (1 - ratio)) / ratio)));
        }
      }

      sourceContext.putImageData(pixels, 0, 0);
      const cleaned = sourceContext.getImageData(0, 0, source.width, source.height).data;
      let minimumX = source.width;
      let minimumY = source.height;
      let maximumX = -1;
      let detectedMaximumY = -1;

      for (let y = 0; y <= maximumY; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          if (cleaned[(y * source.width + x) * 4 + 3] <= 8) continue;
          minimumX = Math.min(minimumX, x);
          minimumY = Math.min(minimumY, y);
          maximumX = Math.max(maximumX, x);
          detectedMaximumY = Math.max(detectedMaximumY, y);
        }
      }

      if (maximumX < minimumX || detectedMaximumY < minimumY) {
        throw new Error("A NexRun brand source image did not contain visible pixels.");
      }

      const cropX = Math.max(0, minimumX - padding);
      const cropY = Math.max(0, minimumY - padding);
      const cropRight = Math.min(source.width, maximumX + padding + 1);
      const cropBottom = Math.min(source.height, detectedMaximumY + padding + 1);
      const output = canvas(cropRight - cropX, cropBottom - cropY);
      output.getContext("2d").drawImage(
        source,
        cropX,
        cropY,
        output.width,
        output.height,
        0,
        0,
        output.width,
        output.height
      );
      return output;
    }

    function recolourToWhite(source) {
      const output = canvas(source.width, source.height);
      const context = output.getContext("2d");
      context.drawImage(source, 0, 0);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, output.width, output.height);
      context.globalCompositeOperation = "source-over";
      return output;
    }

    function roundedSquare(context, x, y, size, radius) {
      context.beginPath();
      context.roundRect(x, y, size, size, radius);
      context.closePath();
    }

    function drawIcon(masterSize, mark, { maskable = false } = {}) {
      const output = canvas(masterSize, masterSize);
      const context = output.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const margin = maskable ? 0 : Math.round(masterSize * 0.055);
      const squareSize = masterSize - margin * 2;
      const radius = maskable ? 0 : Math.round(squareSize * 0.22);
      const gradient = context.createLinearGradient(margin, margin, masterSize - margin, masterSize - margin);
      gradient.addColorStop(0, "#fb923c");
      gradient.addColorStop(0.52, "#f97316");
      gradient.addColorStop(1, "#ea580c");
      roundedSquare(context, margin, margin, squareSize, radius);
      context.fillStyle = gradient;
      context.fill();

      // Keep the N, runner and circular motion core; omit the detached speed particles.
      const compactX = Math.round(mark.width * 0.245);
      const compactWidth = mark.width - compactX - Math.round(mark.width * 0.025);
      const compact = canvas(compactWidth, mark.height);
      compact.getContext("2d").drawImage(
        mark,
        compactX,
        0,
        compactWidth,
        mark.height,
        0,
        0,
        compactWidth,
        mark.height
      );
      const whiteMark = recolourToWhite(compact);
      const targetWidth = masterSize * (maskable ? 0.58 : 0.66);
      const scale = targetWidth / whiteMark.width;
      const targetHeight = whiteMark.height * scale;
      const targetX = (masterSize - targetWidth) / 2;
      const targetY = (masterSize - targetHeight) / 2;
      context.drawImage(whiteMark, targetX, targetY, targetWidth, targetHeight);
      return output;
    }

    function resize(source, size) {
      const output = canvas(size, size);
      const context = output.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, size, size);
      return output;
    }

    function socialCard(lockup) {
      const output = canvas(1200, 630);
      const context = output.getContext("2d");
      const background = context.createLinearGradient(0, 0, 1200, 630);
      background.addColorStop(0, "#fff7ed");
      background.addColorStop(0.55, "#ffffff");
      background.addColorStop(1, "#f5f5f5");
      context.fillStyle = background;
      context.fillRect(0, 0, output.width, output.height);

      const glow = context.createRadialGradient(1050, 80, 0, 1050, 80, 420);
      glow.addColorStop(0, "rgba(249,115,22,0.18)");
      glow.addColorStop(1, "rgba(249,115,22,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, output.width, output.height);

      context.strokeStyle = "rgba(249,115,22,0.24)";
      context.lineWidth = 2;
      roundedSquare(context, 24, 24, 1152, 36);
      context.stroke();

      const targetHeight = 430;
      const targetWidth = lockup.width * (targetHeight / lockup.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        lockup,
        (output.width - targetWidth) / 2,
        (output.height - targetHeight) / 2,
        targetWidth,
        targetHeight
      );
      return output;
    }

    function png(canvasElement) {
      return canvasElement.toDataURL("image/png").split(",")[1];
    }

    const [markImage, lockupImage, wordmarkImage] = await Promise.all([
      loadImage(sources.mark),
      loadImage(sources.lockup),
      loadImage(sources.wordmark),
    ]);
    const mark = cleanAndCrop(markImage);
    const lockup = cleanAndCrop(lockupImage);
    const wordmark = cleanAndCrop(wordmarkImage, { maximumY: 178, padding: 16 });
    const regularIconMaster = drawIcon(1024, mark);
    const maskableIconMaster = drawIcon(1024, mark, { maskable: true });

    return {
      "public/brand/nexrun-mark.png": png(mark),
      "public/brand/nexrun-wordmark.png": png(wordmark),
      "public/brand/nexrun-lockup.png": png(lockup),
      "public/brand/nexrun-social-card.png": png(socialCard(lockup)),
      "src/app/icon.png": png(resize(regularIconMaster, 512)),
      "src/app/apple-icon.png": png(resize(maskableIconMaster, 180)),
      "public/icons/nexrun-pwa-192.png": png(resize(regularIconMaster, 192)),
      "public/icons/nexrun-pwa-512.png": png(resize(regularIconMaster, 512)),
      "public/icons/nexrun-maskable-512.png": png(resize(maskableIconMaster, 512)),
      "favicon-16.png": png(resize(regularIconMaster, 16)),
      "favicon-32.png": png(resize(regularIconMaster, 32)),
      "favicon-48.png": png(resize(regularIconMaster, 48)),
    };
  }, sourceDataUrls);

  const faviconImages = [16, 32, 48].map((size) => ({
    size,
    buffer: Buffer.from(generated[`favicon-${size}.png`], "base64"),
  }));

  for (const [relativePath, encoded] of Object.entries(generated)) {
    if (relativePath.startsWith("favicon-")) continue;
    const outputPath = path.join(projectRoot, relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(encoded, "base64"));
  }

  await writeFile(path.join(projectRoot, "src", "app", "favicon.ico"), createIco(faviconImages));
  console.log("Generated NexRun brand assets from the three source PNG files.");
} finally {
  await browser.close();
}
