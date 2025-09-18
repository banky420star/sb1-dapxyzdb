import { readFile } from 'fs/promises';
import { extname } from 'path';
import Jimp from 'jimp';
import mime from 'mime-types';
import chalk from 'chalk';

export class ImageProcessor {
  private supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  private maxImageSize = 20 * 1024 * 1024; // 20MB
  private maxDimension = 4096; // Max width or height

  async processImage(imagePath: string): Promise<string> {
    // Validate file extension
    const ext = extname(imagePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`Unsupported image format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    try {
      // Read the image file
      const imageBuffer = await readFile(imagePath);
      
      // Check file size
      if (imageBuffer.length > this.maxImageSize) {
        console.log(chalk.yellow(`Image ${imagePath} is too large. Compressing...`));
        return await this.compressImage(imagePath);
      }

      // Check dimensions and resize if needed
      const image = await Jimp.read(imagePath);
      if (image.bitmap.width > this.maxDimension || image.bitmap.height > this.maxDimension) {
        console.log(chalk.yellow(`Image ${imagePath} dimensions too large. Resizing...`));
        return await this.resizeImage(image);
      }

      // Convert to base64
      return imageBuffer.toString('base64');
    } catch (error: any) {
      throw new Error(`Failed to process image ${imagePath}: ${error.message}`);
    }
  }

  async processImages(imagePaths: string[]): Promise<string[]> {
    const processedImages: string[] = [];
    
    for (const path of imagePaths) {
      try {
        const base64 = await this.processImage(path);
        processedImages.push(base64);
        console.log(chalk.green(`✅ Processed image: ${path}`));
      } catch (error: any) {
        console.error(chalk.red(`❌ Failed to process image ${path}: ${error.message}`));
      }
    }
    
    return processedImages;
  }

  private async compressImage(imagePath: string): Promise<string> {
    try {
      const image = await Jimp.read(imagePath);
      
      // Reduce quality to compress
      image.quality(80);
      
      // If still too large, resize
      const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      if (buffer.length > this.maxImageSize) {
        return await this.resizeImage(image);
      }
      
      return buffer.toString('base64');
    } catch (error: any) {
      throw new Error(`Failed to compress image: ${error.message}`);
    }
  }

  private async resizeImage(image: Jimp): Promise<string> {
    // Calculate new dimensions maintaining aspect ratio
    const { width, height } = image.bitmap;
    let newWidth = width;
    let newHeight = height;
    
    if (width > height && width > this.maxDimension) {
      newWidth = this.maxDimension;
      newHeight = Math.round((height * this.maxDimension) / width);
    } else if (height > this.maxDimension) {
      newHeight = this.maxDimension;
      newWidth = Math.round((width * this.maxDimension) / height);
    }
    
    // Resize the image
    image.resize(newWidth, newHeight);
    
    // Convert to buffer and base64
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return buffer.toString('base64');
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    // This would integrate with OCR services like Tesseract or cloud APIs
    // For now, return a placeholder
    console.log(chalk.yellow('OCR functionality not yet implemented'));
    return '';
  }

  async getImageMetadata(imagePath: string): Promise<any> {
    try {
      const image = await Jimp.read(imagePath);
      const stats = await import('fs').then(fs => 
        fs.promises.stat(imagePath)
      );
      
      return {
        path: imagePath,
        width: image.bitmap.width,
        height: image.bitmap.height,
        mimeType: mime.lookup(imagePath),
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error: any) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async convertImageFormat(
    inputPath: string, 
    outputPath: string, 
    format: string
  ): Promise<void> {
    try {
      const image = await Jimp.read(inputPath);
      
      // Map format to Jimp MIME type
      const mimeMap: Record<string, string> = {
        'jpg': Jimp.MIME_JPEG,
        'jpeg': Jimp.MIME_JPEG,
        'png': Jimp.MIME_PNG,
        'bmp': Jimp.MIME_BMP,
        'gif': 'image/gif'
      };
      
      const mimeType = mimeMap[format.toLowerCase()];
      if (!mimeType) {
        throw new Error(`Unsupported output format: ${format}`);
      }
      
      await image.writeAsync(outputPath);
      console.log(chalk.green(`✅ Converted image to ${format}: ${outputPath}`));
    } catch (error: any) {
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  async createThumbnail(
    inputPath: string, 
    outputPath: string, 
    size: number = 200
  ): Promise<void> {
    try {
      const image = await Jimp.read(inputPath);
      
      // Create square thumbnail
      image.cover(size, size);
      
      await image.writeAsync(outputPath);
      console.log(chalk.green(`✅ Created thumbnail: ${outputPath}`));
    } catch (error: any) {
      throw new Error(`Failed to create thumbnail: ${error.message}`);
    }
  }
}


