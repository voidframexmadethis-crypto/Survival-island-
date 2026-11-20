import * as THREE from 'three';

export interface GamePerformanceRecorder {
  (now?: number): void;
  dispose: () => void;
}

export function createGamePerformanceMonitor(
  renderer: THREE.WebGLRenderer,
): GamePerformanceRecorder {
  let frames = 0;
  let lastSample = performance.now();
  let lastFrame = lastSample;
  let worstFrame = 0;
  let totalFrameTime = 0;
  let frameCount = 0;

  const memory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  let longTaskObserver: PerformanceObserver | null = null;

  try {
    if (
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('longtask')
    ) {
      longTaskObserver = new PerformanceObserver((list) => {
        if (
          !(window as unknown as { __ENABLE_PERF_LOG__?: boolean })
            .__ENABLE_PERF_LOG__
        ) {
          return;
        }
        for (const task of list.getEntries()) {
          console.warn(
            '[GAME PERFORMANCE] Long task:',
            Math.round(task.duration),
            'ms',
          );
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  } catch {
    // Ignore unsupported longtask observer
  }

  const recordFrame = ((now = performance.now()) => {
    frames++;
    frameCount++;

    const frameTime = Math.max(0, now - lastFrame);
    lastFrame = now;
    totalFrameTime += frameTime;
    worstFrame = Math.max(worstFrame, frameTime);

    const elapsedSample = now - lastSample;
    if (elapsedSample >= 1000) {
      const debugLog = Boolean(
        typeof window !== 'undefined' &&
          (window as unknown as { __ENABLE_PERF_LOG__?: boolean })
            .__ENABLE_PERF_LOG__,
      );
      if (debugLog) {
        const fps = Math.round((frames * 1000) / elapsedSample);
        const report = {
          fps,
          averageFrameTimeMs: Number((totalFrameTime / frameCount).toFixed(2)),
          worstFrameTimeMs: Number(worstFrame.toFixed(2)),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          jsHeapMB: memory.memory
            ? Number((memory.memory.usedJSHeapSize / 1024 / 1024).toFixed(1))
            : 'Unavailable',
        };
        console.table(report);
        if (fps < 30) {
          console.warn(
            '[GAME PERFORMANCE] Critical FPS drop detected.',
            report,
          );
        }
      }

      frames = 0;
      frameCount = 0;
      totalFrameTime = 0;
      worstFrame = 0;
      lastSample = now;
    }
  }) as GamePerformanceRecorder;

  recordFrame.dispose = () => {
    try {
      longTaskObserver?.disconnect();
    } catch {
      // Ignore disconnect errors on shutdown
    }
    longTaskObserver = null;
  };

  return recordFrame;
}
