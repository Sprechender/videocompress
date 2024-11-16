'use client';
// import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDropzone } from 'react-dropzone';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { GithubLink } from "@/components/github-link"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { getAutoQuality, convertVideo, RateControlSettings, ResolutionSettings } from "@/lib/videoUtils";
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function Home() {
  // Add new state for overall page loading
  const [pageReady, setPageReady] = useState(false);
  
  // State management for file handling and conversion
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  
  // Video conversion settings
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState(28); // CRF value - lower is better quality
  const [autoQuality, setAutoQuality] = useState(true);
  const [resolution, setResolution] = useState("original");
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");
  const [rateControl, setRateControl] = useState("crf"); // "crf" or "cbr"
  const [bitrate, setBitrate] = useState("4000"); // kbps
  
  const [error, setError] = useState<string | null>(null);
  
  // Add new state for progress
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  const handleFileDrop = useCallback((file: File) => {
    setError(null);
    
    // Create preview URL and update state
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Set automatic quality if enabled
    if (autoQuality && rateControl === "crf") {
      setQuality(getAutoQuality(file));
    }
  }, [autoQuality, format, rateControl]);

  const dropzoneConfig = useMemo(() => ({
    accept: {
      'video/*': []
    },
    maxFiles: 1,
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileDrop(acceptedFiles[0]);
      }
    }
  }), [handleFileDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneConfig);

  // Automatically set quality based on file size and format
  useEffect(() => {
    if (selectedFile && autoQuality && rateControl === "crf") {
      const automaticQuality = getAutoQuality(selectedFile);
      setQuality(automaticQuality);
    }
  }, [selectedFile, autoQuality, rateControl]);

  const handleConvert = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setConverting(true);
      setError(null);
      setProgress(0);
      
      // Start time tracking
      const startTime = Date.now();
      
      // Prepare resolution settings
      const resolutionSettings: ResolutionSettings = resolution === 'custom' 
        ? { width: parseInt(customWidth), height: parseInt(customHeight) }
        : resolution as ResolutionSettings;

      // Prepare rate control settings
      const rateSettings: RateControlSettings = {
        mode: rateControl as 'crf' | 'cbr',
        value: rateControl === 'crf' ? quality : parseInt(bitrate)
      };
      
      // Convert video using selected settings with progress callback
      const blob = await convertVideo(selectedFile, format, rateSettings, (progress) => {
        setProgress(progress);
        
        // Calculate estimated time remaining
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        if (progress > 0) { // Only calculate if we have progress to avoid division by zero
          const estimatedTotal = elapsed / (progress / 100);
          const remaining = Math.max(0, estimatedTotal - elapsed);
          setEstimatedTime(`${remaining.toFixed(1)}s remaining`);
        }
      }, resolutionSettings);
      
      // Create download URL and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const originalName = selectedFile.name.split('.').slice(0, -1).join('.');
      a.href = url;
      a.download = `${originalName}-compressed.${format}`;
      a.click();
      URL.revokeObjectURL(url); // Clean up immediately after triggering download
    } catch (error: unknown) {
      console.error('Conversion error details:', error);
      setError(
        `Conversion failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setConverting(false);
      setProgress(0);
      setEstimatedTime(null);
    }
  }, [selectedFile, format, quality, resolution, customWidth, customHeight, rateControl, bitrate]);

  // Add useEffect to handle initial page load
  useEffect(() => {
    setPageReady(true);
  }, []);

  // Clean up preview URL when component unmounts or when previewUrl changes
  useEffect(() => {
    const currentPreviewUrl = previewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [previewUrl]);

  const loadingSpinner = useMemo(() => (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
    </div>
  ), []);

  if (!pageReady) {
    return loadingSpinner;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 gap-8 animate-in fade-in duration-500">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <GithubLink />
        <ThemeToggle />
      </div>
      <Card className="min-w-[400px] max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">videocompress</CardTitle>
          <CardDescription className="truncate">
            {selectedFile ? selectedFile.name : "No file selected"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleConvert}>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/10' : selectedFile ? 'border-primary bg-green-100 dark:bg-green-900/20' : 'border-muted-foreground/25 hover:border-primary'}`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the video here...</p>
              ) : selectedFile ? (
                <p>Video selected - Click or drop to change</p>
              ) : (
                <div className="space-y-2">
                  <p>Drag & drop a video here, or click to select</p>
                  <p className="text-sm text-muted-foreground">Supports MP4 and MOV</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Convert to</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="480p">480p (854x480)</SelectItem>
                  <SelectItem value="360p">360p (640x360)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {resolution === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="width" className="text-xs">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rate Control</Label>
              <RadioGroup value={rateControl} onValueChange={setRateControl} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="crf" id="crf" />
                  <Label htmlFor="crf">Constant Rate Factor (CRF)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cbr" id="cbr" />
                  <Label htmlFor="cbr">Constant Bitrate (CBR)</Label>
                </div>
              </RadioGroup>

              {rateControl === 'crf' ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="quality">Quality (CRF)</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="autoQuality" className="text-sm text-muted-foreground">Auto</Label>
                      <Checkbox
                        id="autoQuality"
                        checked={autoQuality}
                        onCheckedChange={(checked: boolean) => setAutoQuality(checked)}
                      />
                      <span className="text-sm text-muted-foreground">{quality}</span>
                    </div>
                  </div>
                  <Slider
                    id="quality"
                    min={0}
                    max={51}
                    step={1}
                    value={[quality]}
                    onValueChange={(value) => {
                      setAutoQuality(false);
                      setQuality(value[0]);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Lower values mean better quality but larger file size (0-51)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="bitrate">Bitrate (kbps)</Label>
                  <Input
                    id="bitrate"
                    type="number"
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value)}
                    min="100"
                    max="20000"
                  />
                  <p className="text-xs text-muted-foreground">Higher values mean better quality but larger file size</p>
                </div>
              )}
            </div>

            {converting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  {estimatedTime || 'Calculating...'}
                </p>
              </div>
            )}

            <Button className="w-full" type="submit" disabled={!selectedFile || converting}>
              {converting ? "Converting..." : "Download Video"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {previewUrl && (
        <Card className="min-w-[400px] max-w-lg">
          <CardContent className="pt-6">
            <div className="relative aspect-video">
              <video
                src={previewUrl}
                className="w-full h-full object-contain"
                controls
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
