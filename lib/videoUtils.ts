import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let coreLoaded = false;

// Initialize FFmpeg instance
async function initFFmpeg() {
  if (ffmpeg && coreLoaded) return ffmpeg;

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }
  
  if (!coreLoaded) {
    try {
      // Cache the core and wasm URLs to avoid repeated fetches
      const coreURL = await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js', 'application/javascript');
      const wasmURL = await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm', 'application/wasm');

      // Load FFmpeg with cached URLs
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      coreLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('FFmpeg initialization error:', error);
      throw new Error(`Failed to initialize FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return ffmpeg;
}

// Get automatic quality setting based on file size and format
export function getAutoQuality(file: File): number {
  const sizeInMB = file.size / (1024 * 1024);
  
  // Optimized quality settings with smoother transitions
  if (sizeInMB < 5) return 23;
  if (sizeInMB < 20) return 26;
  if (sizeInMB < 50) return 29;
  if (sizeInMB < 100) return 31;
  return 33;
}

// Generate a preview of the video with current settings
export async function generateVideoPreview(
  file: File,
  format: string,
  quality: number
): Promise<string> {
  const ff = await initFFmpeg();
  
  try {
    // Write input file to FFmpeg's virtual filesystem
    await ff.writeFile('input', await fetchFile(file));
    
    // Generate a shorter preview (2 seconds) with optimized settings
    await ff.exec([
      '-i', 'input',
      '-t', '2',
      '-c:v', 'libx264',
      '-crf', quality.toString(),
      '-preset', 'veryfast', // Faster encoding for preview
      '-tune', 'fastdecode', // Optimize for playback performance
      '-an', // Remove audio for preview
      'preview.' + format
    ]);

    // Read the preview file
    const data = await ff.readFile('preview.' + format);
    const uint8Array = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    
    // Clean up immediately
    await Promise.all([
      ff.deleteFile('input'),
      ff.deleteFile('preview.' + format)
    ]);
    
    return URL.createObjectURL(new Blob([uint8Array], { type: `video/${format}` }));
  } catch (error) {
    console.error('Preview generation error:', error);
    throw error;
  }
}

// Add type definitions
export type RateControlSettings = {
  mode: 'crf' | 'cbr';
  value: number;
};

export type ResolutionSettings = 'original' | '1080p' | '720p' | '480p' | '360p' | {
  width: number;
  height: number;
};

// Resolution lookup table for better performance
const RESOLUTION_PRESETS: Record<string, [number, number]> = {
  '1080p': [1920, 1080],
  '720p': [1280, 720],
  '480p': [854, 480],
  '360p': [640, 360]
};

// Update convertVideo function
export const convertVideo = async (
  file: File,
  format: string,
  rateControl: RateControlSettings,
  onProgress?: (progress: number) => void,
  resolution?: ResolutionSettings
) => {
  const ff = await initFFmpeg();
  
  try {
    await ff.writeFile('input', await fetchFile(file));
    
    ff.on('progress', ({ progress }: { progress: number }) => {
      onProgress?.(Math.round(progress * 100));
    });

    const command = ['-i', 'input'];

    // Add resolution settings if needed
    if (resolution && resolution !== 'original') {
      const [width, height] = typeof resolution === 'object' 
        ? [resolution.width, resolution.height]
        : RESOLUTION_PRESETS[resolution] || RESOLUTION_PRESETS['1080p'];
      
      command.push('-vf', `scale=${width}:${height}`);
    }

    // Add video codec with optimized settings
    command.push(
      '-c:v', 'libx264',
      '-movflags', '+faststart' // Optimize for web playback
    );

    // Add rate control settings
    if (rateControl.mode === 'crf') {
      command.push(
        '-crf', rateControl.value.toString(),
        '-b:v', '0'
      );
    } else {
      const bitrate = rateControl.value;
      command.push(
        '-b:v', `${bitrate}k`,
        '-maxrate', `${bitrate * 1.5}k`,
        '-bufsize', `${bitrate * 2}k`
      );
    }

    // Add remaining settings with optimized preset
    command.push(
      '-preset', 'faster', // Better balance of speed/quality
      '-tune', 'film', // Optimize for typical video content
      '-c:a', 'aac',
      '-b:a', '128k', // Reasonable audio bitrate
      'output.' + format
    );

    await ff.exec(command);

    const data = await ff.readFile('output.' + format);
    const uint8Array = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    
    // Clean up concurrently
    await Promise.all([
      ff.deleteFile('input'),
      ff.deleteFile('output.' + format)
    ]);
    
    return new Blob([uint8Array], { type: `video/${format}` });
  } catch (error) {
    console.error('Conversion error:', error);
    throw error;
  }
} 