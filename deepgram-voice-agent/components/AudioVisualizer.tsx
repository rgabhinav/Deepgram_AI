'use client';

import { useEffect, useRef } from 'react';
import { AudioManager } from '@/lib/audio';

interface AudioVisualizerProps {
  audioData: Uint8Array | null;
  isActive: boolean;
}

export function AudioVisualizer({ audioData, isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive || !audioData) {
        // Draw inactive state
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Calculate volume
      const volume = AudioManager.calculateVolume(audioData);
      
      // Draw waveform
      const barWidth = width / audioData.length;
      const maxBarHeight = height * 0.8;

      for (let i = 0; i < audioData.length; i++) {
        const barHeight = (audioData[i] / 255) * maxBarHeight;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Color based on volume
        const intensity = Math.min(1, volume * 2);
        const red = Math.floor(46 + intensity * 209); // From slate-700 to red-500
        const green = Math.floor(125 - intensity * 125);
        const blue = Math.floor(249 - intensity * 166);

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      // Draw volume indicator
      const volumeHeight = volume * height * 0.9;
      ctx.fillStyle = isActive ? '#10b981' : '#6b7280';
      ctx.fillRect(width - 20, height - volumeHeight, 15, volumeHeight);
    };

    draw();
  }, [audioData, isActive]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-24 bg-slate-50 dark:bg-slate-700 rounded-lg"
        style={{ width: '100%', height: '96px' }}
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            Audio visualization will appear here
          </div>
        </div>
      )}
      
      {isActive && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-600 dark:text-slate-300">REC</span>
        </div>
      )}
    </div>
  );
}