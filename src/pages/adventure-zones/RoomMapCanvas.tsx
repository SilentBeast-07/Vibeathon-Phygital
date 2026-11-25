import React, { useRef, useState } from 'react';
import { Eraser, RotateCcw } from 'lucide-react';

export function RoomMapCanvas({ onSaveSnapshot }: { onSaveSnapshot: (hasDrawn: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#4A3525');
  const [strokeCount, setStrokeCount] = useState(0);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setDrawing(true);
    setStrokeCount((c) => {
      const next = c + 1;
      onSaveSnapshot(next > 0);
      return next;
    });
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
    onSaveSnapshot(false);
  }

  return (
    <div className="rounded-2xl border-2 border-earth/20 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-earth">
          Room Map Sketchpad ({strokeCount} strokes)
        </span>
        <div className="flex items-center gap-2">
          {[
            { hex: '#4A3525', label: 'Ink' },
            { hex: '#C77B5A', label: 'Terracotta' },
            { hex: '#A5B49A', label: 'Sage' },
            { hex: '#E8C878', label: 'Sun' },
          ].map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setColor(c.hex)}
              aria-label={`Select ${c.label} pen`}
              className={`h-6 w-6 rounded-full border-2 ${
                color === c.hex ? 'border-ink scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1 rounded-full bg-cardwarm px-2.5 py-1 text-xs font-bold text-ink"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
          <Eraser className="hidden h-4 w-4 text-earth sm:inline" />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={540}
        height={240}
        onPointerDown={startDraw}
        onPointerMove={moveDraw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        className="h-48 w-full touch-none rounded-xl border border-dashed border-earth/30 bg-[#FAF8F5]"
      />
    </div>
  );
}
