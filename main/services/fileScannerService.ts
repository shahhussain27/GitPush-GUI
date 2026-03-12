import fs from 'fs/promises';
import path from 'path';

export interface ScannedFile {
  path: string;
  sizeBytes: number;
  sizeMB: number;
  action: 'BLOCK' | 'WARN' | 'LFS' | 'NONE';
  extension: string;
}

const LIMITS = {
  BLOCK: 100 * 1024 * 1024, // 100MB
  WARN: 50 * 1024 * 1024,   // 50MB
  LFS: 10 * 1024 * 1024,    // 10MB
};

// Known large file extensions
const LFS_EXTENSIONS = new Set([
  '.psd', '.zip', '.mp4', '.wav', '.fbx', '.blend', '.unitypackage', 
  '.mp3', '.mov', '.avi', '.mkv', '.iso', '.tar', '.gz', '.dll', '.so', '.dylib', '.bin', '.exe'
]);

class FileScannerService {
  async getFileSize(absolutePath: string): Promise<number> {
    try {
      const stats = await fs.stat(absolutePath);
      return stats.size;
    } catch {
      return 0; // File might be deleted
    }
  }

  getActionForSize(sizeBytes: number, extension: string): 'BLOCK' | 'WARN' | 'LFS' | 'NONE' {
    if (sizeBytes >= LIMITS.BLOCK) return 'BLOCK';
    if (sizeBytes >= LIMITS.WARN) return 'WARN';
    if (sizeBytes >= LIMITS.LFS || LFS_EXTENSIONS.has(extension)) return 'LFS';
    return 'NONE';
  }

  async scanFiles(projectPath: string | null, filePaths: string[]): Promise<ScannedFile[]> {
    if (!projectPath) return [];

    const scannedFiles: ScannedFile[] = [];

    for (const relativePath of filePaths) {
      if (!relativePath) continue;
      const absolutePath = path.join(projectPath, relativePath);
      const sizeBytes = await this.getFileSize(absolutePath);
      const sizeMB = sizeBytes / (1024 * 1024);
      const extension = path.extname(absolutePath).toLowerCase();
      const action = this.getActionForSize(sizeBytes, extension);

      if (action !== 'NONE') {
        scannedFiles.push({
          path: relativePath,
          sizeBytes,
          sizeMB,
          action,
          extension
        });
      }
    }

    // Sort by size descending
    return scannedFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }
}

export const fileScannerService = new FileScannerService();
