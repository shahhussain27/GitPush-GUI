import { gitService } from './gitService';

class LFSService {
  async isLFSInstalled(): Promise<boolean> {
    try {
      await gitService.execute(['lfs', 'version']);
      return true;
    } catch (e) {
      return false;
    }
  }

  async install(): Promise<void> {
    return await gitService.execute(['lfs', 'install']);
  }

  async track(pattern: string): Promise<void> {
    return await gitService.execute(['lfs', 'track', pattern]);
  }

  async getStatus(): Promise<string> {
    let output = '';
    await gitService.execute(['lfs', 'track'], (data) => output += data);
    return output;
  }
}

export const lfsService = new LFSService();
