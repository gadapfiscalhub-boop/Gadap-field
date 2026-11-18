'use client';

import { useRef, useState } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  PenTool,
  ShieldCheck,
  AlertOctagon,
  Share2,
  Trash2,
  Check,
  MapPin,
} from 'lucide-react';
import { enqueueOfflineAction } from '@/lib/offline-queue';

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function FieldExtrasPanel({
  sunMode,
  onNotify,
}: {
  sunMode: boolean;
  onNotify: (type: 'success' | 'warning' | 'info', text: string) => void;
}) {
  // 1. Foto RDO com Marca d'água
  const [watermarkedPhoto, setWatermarkedPhoto] = useState<string | null>(null);
  const [rdoNote, setRdoNote] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // 2. Assinatura Digital
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 3. Checklist SST / DDS
  const [sstItems, setSstItems] = useState([
    { id: 'epi', label: 'EPIs completos (Capacete, Bota, Óculos)', checked: false },
    { id: 'dds', label: 'DDS realizado com a equipe', checked: false },
    { id: 'isolamento', label: 'Área isolada e sinalizada', checked: false },
    { id: 'altura', label: 'Cinto/linha de vida (se trabalho em altura)', checked: false },
  ]);

  // 4. Ocorrência / RNC
  const [rncTitle, setRncTitle] = useState('');
  const [rncSeverity, setRncSeverity] = useState<'baixa' | 'media' | 'alta'>('media');

  const cardClass = sunMode
    ? 'bg-white border-slate-300 text-slate-900'
    : 'bg-slate-900/80 border-slate-800 text-slate-100';

  const inputClass = sunMode
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
    : 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500';

  // Foto com marca d'água GPS + Data/Hora
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const drawWatermark = (gpsText: string) => {
          const now = new Date().toLocaleString('pt-BR');
          const barH = 54;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
          ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(`GADAP FIELD • ${now}`, 12, canvas.height - 30);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px sans-serif';
          ctx.fillText(gpsText, 12, canvas.height - 12);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setWatermarkedPhoto(dataUrl);
          onNotify('success', 'Foto comprimida com marca d’água GPS!');
        };

        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              drawWatermark(
                `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
              ),
            () => drawWatermark('GPS: indisponível no momento'),
            { timeout: 3500 }
          );
        } else {
          drawWatermark('GPS: não suportado');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Entrada por Voz (Web Speech API)
  const toggleVoiceInput = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      onNotify('warning', 'Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) {
        setRdoNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  // Assinatura Digital
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = sigCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.strokeStyle = sunMode ? '#0f172a' : '#10b981';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = sigCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const saveRdoOfflineOrOnline = () => {
    enqueueOfflineAction('rdo', {
      note: rdoNote,
      hasPhoto: Boolean(watermarkedPhoto),
      hasSignature,
      sstChecked: sstItems.filter((i) => i.checked).map((i) => i.id),
    });
    onNotify('success', 'RDO salvo na fila de sincronização!');
  };

  const saveRnc = () => {
    if (!rncTitle.trim()) {
      onNotify('warning', 'Descreva a ocorrência antes de registrar.');
      return;
    }
    enqueueOfflineAction('rnc', { title: rncTitle.trim(), severity: rncSeverity });
    setRncTitle('');
    onNotify('success', 'Ocorrência (RNC) registrada!');
  };

  const shareWhatsAppSummary = async () => {
    const doneSst = sstItems.filter((i) => i.checked).length;
    const text = [
      `*GADAP Field - Resumo de Campo*`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Checklist SST/DDS: ${doneSst}/${sstItems.length} itens ok`,
      rdoNote ? `Observações: ${rdoNote}` : null,
      watermarkedPhoto ? `Foto com GPS anexada: Sim` : null,
      hasSignature ? `Assinatura digital: Coletada` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'GADAP Field - Resumo', text });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    onNotify('info', 'Resumo copiado! Cole no WhatsApp.');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* RDO + Foto com Marca d'água + Voz */}
      <section className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            Diário de Obra (RDO) & Voz
          </h3>
          <button
            type="button"
            onClick={shareWhatsAppSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 min-h-[36px]"
          >
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
          </button>
        </div>

        <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-emerald-500/50 text-emerald-500 font-semibold text-sm cursor-pointer hover:bg-emerald-500/10 min-h-[48px]">
          <Camera className="w-5 h-5" />
          Tirar Foto com Marca d&apos;água GPS
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
        </label>

        {watermarkedPhoto && (
          <img
            src={watermarkedPhoto}
            alt="Foto RDO com marca d'água"
            className="w-full rounded-xl border border-slate-700 max-h-64 object-cover"
          />
        )}

        <div className="flex gap-2">
          <textarea
            rows={2}
            value={rdoNote}
            onChange={(e) => setRdoNote(e.target.value)}
            placeholder="Dite ou escreva observações do dia..."
            className={`flex-1 rounded-xl border px-3 py-2 text-sm ${inputClass}`}
          />
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`px-3 rounded-xl border flex items-center justify-center min-w-[48px] ${
              listening
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
            }`}
            title="Ditar por voz"
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={saveRdoOfflineOrOnline}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 min-h-[48px]"
        >
          Salvar RDO (Offline-First)
        </button>
      </section>

      {/* Assinatura Digital */}
      <section className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <PenTool className="w-5 h-5 text-sky-400" />
            Assinatura Digital (Conferente / Motorista)
          </h3>
          <button
            type="button"
            onClick={clearSignature}
            className="inline-flex items-center gap-1 text-xs text-rose-400 hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>

        <canvas
          ref={sigCanvasRef}
          width={600}
          height={180}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          className={`w-full h-36 rounded-xl border touch-none ${
            sunMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
          }`}
        />
      </section>

      {/* Checklist SST / DDS */}
      <section className={`p-4 rounded-2xl border space-y-2.5 ${cardClass}`}>
        <h3 className="font-bold text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Checklist Diário SST / DDS
        </h3>
        {sstItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              setSstItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))
              )
            }
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border text-left text-sm min-h-[48px] ${
              item.checked
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold'
                : inputClass
            }`}
          >
            <span>{item.label}</span>
            {item.checked && <Check className="w-4 h-4 shrink-0" />}
          </button>
        ))}
      </section>

      {/* Ocorrências / RNC */}
      <section className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
        <h3 className="font-bold text-base flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          Registrar Ocorrência / RNC
        </h3>
        <input
          type="text"
          value={rncTitle}
          onChange={(e) => setRncTitle(e.target.value)}
          placeholder="Ex: Falta de material na frente B, chuva forte..."
          className={`w-full rounded-xl border px-3 py-3 text-sm min-h-[48px] ${inputClass}`}
        />
        <div className="flex gap-2">
          {(['baixa', 'media', 'alta'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setRncSeverity(sev)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase border min-h-[44px] ${
                rncSeverity === sev
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : inputClass
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={saveRnc}
          className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-500 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <MapPin className="w-4 h-4" />
          Registrar Ocorrência
        </button>
      </section>
    </div>
  );
}
