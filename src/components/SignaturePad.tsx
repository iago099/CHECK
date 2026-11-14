import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl border border-emerald-500/30 bg-[#0b0d11] p-3 flex flex-col items-center">
          <img src={value} alt="Assinatura Digital" className="max-h-28 object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={clearCanvas}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Limpar e Assinar Novamente
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/80 bg-[#0b0d11] p-2">
          <canvas
            ref={canvasRef}
            width={420}
            height={110}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[110px] cursor-crosshair rounded-lg bg-[#0e1218]"
          />
          <div className="flex items-center justify-between pt-1.5 px-1 text-[11px] text-slate-400">
            <span>Desenhe a assinatura com o mouse ou toque na tela</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              Limpar Quadro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
