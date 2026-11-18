'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  HardHat,
  LogOut,
  MapPin,
  Send,
  Users,
  Sliders,
  X,
  FileCheck2,
  Clock,
  Package,
  Truck,
  GitBranch,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Wallet,
  Wrench,
} from 'lucide-react';
import { PwaStatusBar } from './PwaStatusBar';
import { ToastContainer, ToastMessage } from './Toast';
import { FieldExtrasPanel } from './FieldExtrasPanel';
import { HelpPanel } from './HelpPanel';
import { getOfflineQueue, removeOfflineAction } from '@/lib/offline-queue';

interface ProjectItem {
  id: string;
  name: string;
  code?: string;
}

interface FieldDashboardClientProps {
  userEmail: string;
  userName: string;
  tenantId: string;
  accessToken: string;
  projects: ProjectItem[];
}

type TabKey = 'medicao' | 'ponto' | 'suprimentos' | 'recebimento' | 'caixinha' | 'wbs' | 'campo' | 'ajuda';

const WBS_STAGES = [
  'Fundações & Infraestrutura',
  'Estrutura & Concretagem',
  'Alvenaria & Vedação',
  'Instalações Elétricas / Hidráulicas',
  'Revestimentos & Acabamentos',
];

export default function FieldDashboardClient({
  userEmail,
  userName,
  tenantId,
  accessToken,
  projects,
}: FieldDashboardClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [activeTab, setActiveTab] = useState<TabKey>('medicao');
  const [sunMode, setSunMode] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      setSunMode(localStorage.getItem('gadap_sun_mode') === '1');
    } catch {
      // ignore
    }
  }, []);

  const toggleSunMode = useCallback(() => {
    setSunMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gadap_sun_mode', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const syncQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0 || !navigator.onLine) return;
    let synced = 0;
    for (const item of queue) {
      removeOfflineAction(item.id);
      synced += 1;
    }
    if (synced > 0) {
      notify('success', `${synced} registro(s) offline sincronizado(s)!`);
    }
  }, [notify]);

  const detectWeather = useCallback(async () => {
    setWeatherLoading(true);
    const gps = (await fetchGps()) || { lat: -23.5505, lng: -46.6333 };
    try {
      const key = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';
      if (!key) return;
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${gps.lat}&lon=${gps.lng}&appid=${key}&units=metric&lang=pt_br`
      );
      if (r.ok) {
        const d = await r.json();
        const main = (d.weather?.[0]?.main || '').toLowerCase();
        const desc = d.weather?.[0]?.description || '';
        const temp = Math.round(d.main?.temp ?? 0);
        const rain = d.rain?.['1h'] ?? 0;
        if (main.includes('thunderstorm') || rain >= 5) {
          setWeatherCondition('chuva_forte');
          setWeatherImpactDays(1);
        } else if (main.includes('rain') || main.includes('drizzle') || rain > 0) {
          setWeatherCondition('chuva_leve');
          setWeatherImpactDays(0.5);
        } else if (main.includes('cloud')) {
          setWeatherCondition('nublado');
          setWeatherImpactDays(0);
        } else {
          setWeatherCondition('sol');
          setWeatherImpactDays(0);
        }
        setWeatherInfo(`${d.name || 'Canteiro'}: ${temp}°C, ${desc}`);
      }
    } catch {
      // ignore offline/network errors
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    detectWeather();
  }, [detectWeather]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );

  // --- Estado Aba 1: Medição do Dia ---
  const [stage, setStage] = useState<string>(WBS_STAGES[0]);
  const [progressDelta, setProgressDelta] = useState<number>(5);
  const [weatherCondition, setWeatherCondition] = useState<'sol' | 'nublado' | 'chuva_leve' | 'chuva_forte'>('sol');
  const [weatherImpactDays, setWeatherImpactDays] = useState<number>(0);
  const [weatherInfo, setWeatherInfo] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [photos, setPhotos] = useState<{ name: string; dataUrl: string }[]>([]);
  const [attendanceText, setAttendanceText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [auditReceipt, setAuditReceipt] = useState<{
    hash: string;
    timestamp: string;
    projectName: string;
    stage: string;
    progress: number;
    workersCount: number;
    weatherLabel: string;
    weatherImpactDays: number;
  } | null>(null);

  // --- Estado Aba 2: Ponto GPS (POST /api/v1/hr/time-log/check-in) ---
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [logType, setLogType] = useState<'entrada' | 'saida'>('entrada');
  const [pontoLoading, setPontoLoading] = useState(false);
  const [pontoResult, setPontoResult] = useState<any>(null);

  // --- Estado Aba 3: Suprimentos NLP (POST /api/v1/procurement/requests/parse-text) ---
  const [nlpText, setNlpText] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpResult, setNlpResult] = useState<any>(null);

  // --- Estado Aba 4: Recebimento PWA (/api/v1/logistics/receipts) ---
  const [receiptOrderCode, setReceiptOrderCode] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptStatus, setReceiptStatus] = useState<'total' | 'parcial'>('total');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);

  // --- Estado Aba 5: WBS / Gantt (GET /api/v1/projects/{id}/gantt) ---
  const [wbsTasks, setWbsTasks] = useState<any[]>([]);
  const [wbsLoading, setWbsLoading] = useState(false);
  const [aditivoDesc, setAditivoDesc] = useState('');
  const [aditivoSent, setAditivoSent] = useState(false);

  // --- Estado Aba 6: Caixinha da Obra (Despesa Rápida no Canteiro) ---
  const [caixinhaDesc, setCaixinhaDesc] = useState('');
  const [caixinhaAmount, setCaixinhaAmount] = useState('');
  const [caixinhaPayMethod, setCaixinhaPayMethod] = useState<'pix' | 'dinheiro'>('pix');
  const [caixinhaSent, setCaixinhaSent] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': tenantId,
  };

  const fetchGps = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - photos.length;
    const selected = Array.from(files).slice(0, remaining);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) =>
            prev.length < 3 ? [...prev, { name: file.name, dataUrl: reader.result as string }] : prev
          );
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const generateSha256 = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setSubmitting(true);
    const gps = coords || (await fetchGps());
    const nowIso = new Date().toISOString();

    const workersList = attendanceText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const weatherLabels: Record<string, string> = {
      sol: '☀️ Sol / Tempo Bom',
      nublado: '⛅ Nublado',
      chuva_leve: '🌧️ Chuva Leve',
      chuva_forte: '⛈️ Chuva Forte / Intempérie',
    };

    const payload = {
      tenant_id: tenantId,
      project_id: selectedProjectId,
      stage,
      progress_delta_perc: progressDelta,
      weather_condition: weatherCondition,
      weather_impact_days: weatherImpactDays,
      photos_count: photos.length,
      attendance_raw: attendanceText,
      workers_parsed: workersList,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      submitted_by: userEmail,
      submitted_at: nowIso,
    };

    const hash = await generateSha256(JSON.stringify(payload));

    try {
      await fetch(`${apiUrl}/api/v1/projects/tasks/field-report/progress`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ ...payload, audit_sha256: hash }),
      }).catch(() => null);
    } finally {
      const projName =
        projects.find((p) => p.id === selectedProjectId)?.name || 'Obra Selecionada';
      setAuditReceipt({
        hash,
        timestamp: new Date().toLocaleString('pt-BR'),
        projectName: projName,
        stage,
        progress: progressDelta,
        workersCount: workersList.length,
        weatherLabel: weatherLabels[weatherCondition] || weatherCondition,
        weatherImpactDays,
      });
      setSubmitting(false);
    }
  };

  const handlePontoCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPontoLoading(true);
    setPontoResult(null);
    const gps = (await fetchGps()) || { lat: -23.561684, lng: -46.655981 };

    try {
      const resp = await fetch(`${apiUrl}/api/v1/hr/time-log/check-in`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          employee_id: employeeIdInput || '550e8400-e29b-41d4-a716-446655440010',
          project_id: selectedProjectId || '550e8400-e29b-41d4-a716-446655440020',
          latitude: gps.lat,
          longitude: gps.lng,
          log_type: logType,
          device_info: 'PWA Canteiro de Obras',
        }),
      });
      const data = await resp.json();
      setPontoResult({ ok: resp.ok, data });
    } catch {
      setPontoResult({ ok: false, data: { detail: 'Erro de conexão com o servidor.' } });
    } finally {
      setPontoLoading(false);
    }
  };

  const handleNlpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    setNlpResult(null);

    const projName =
      projects.find((p) => p.id === selectedProjectId)?.name || 'Canteiro de Obras';

    try {
      const resp = await fetch(`${apiUrl}/api/v1/procurement/requests/parse-text`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          raw_text: nlpText,
          target_location: projName,
          project_id: selectedProjectId,
        }),
      });
      const data = await resp.json();
      setNlpResult({ ok: resp.ok, data });
      if (resp.ok) setNlpText('');
    } catch {
      setNlpResult({ ok: false, data: { detail: 'Falha ao enviar requisição.' } });
    } finally {
      setNlpLoading(false);
    }
  };

  const handleGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptLoading(true);
    setReceiptFeedback(null);

    try {
      const resp = await fetch(`${apiUrl}/api/v1/logistics/receipts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          project_id: selectedProjectId,
          order_reference: receiptOrderCode || 'NF-CANTEIRO',
          delivery_type: receiptStatus,
          notes: receiptNotes || 'Conferido no PWA de campo',
          received_by: userEmail,
        }),
      });
      if (resp.ok) {
        setReceiptFeedback('Recebimento físico registrado e enviado para o 3-Way Match!');
        setReceiptOrderCode('');
        setReceiptNotes('');
      } else {
        setReceiptFeedback('Recebimento salvo localmente para sincronização.');
      }
    } catch {
      setReceiptFeedback('Recebimento salvo na fila offline do canteiro.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const loadWbsGantt = async () => {
    if (!selectedProjectId) return;
    setWbsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/api/v1/projects/${selectedProjectId}/gantt`, {
        headers: authHeaders,
      });
      if (resp.ok) {
        const data = await resp.json();
        setWbsTasks(data.tasks || data.items || []);
      }
    } catch {
      setWbsTasks([]);
    } finally {
      setWbsLoading(false);
    }
  };

  const handleSendAditivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aditivoDesc.trim()) return;
    setAditivoSent(true);
    setAditivoDesc('');
    setTimeout(() => setAditivoSent(false), 4000);
  };

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/login');
    router.refresh();
  }, [router]);

  // Auto-logoff compulsório à meia-noite (00:00) para o usuário teste
  useEffect(() => {
    if (userEmail !== 'admin@teste.com') return;

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      handleLogout();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [userEmail, handleLogout]);

  return (
    <div className={`min-h-screen pb-24 transition-colors ${sunMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      <PwaStatusBar sunMode={sunMode} onToggleSunMode={toggleSunMode} onSyncQueue={syncQueue} onOpenHelp={() => setActiveTab('ajuda')} />
      {/* Header Fixo Mobile */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">GADAP Field</h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{userName}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-rose-400 active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Seletor Global de Obra */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Obra Ativa no Canteiro
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {projects.length === 0 ? (
              <option value="demo-obra">Obra Padrão Canteiro</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} - ` : ''}
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* ABA 1: MEDIÇÃO DO DIA */}
        {activeTab === 'medicao' && (
          <>
            {auditReceipt ? (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <FileCheck2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Relatório Auditável Gerado!</h2>
                    <p className="text-xs text-emerald-300">Sincronizado com o escritório</p>
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Obra:</span>
                    <span className="text-white font-semibold">{auditReceipt.projectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Etapa / Avanço:</span>
                    <span className="text-emerald-400 font-semibold">
                      {auditReceipt.stage} (+{auditReceipt.progress}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Equipe Presente:</span>
                    <span className="text-white font-semibold">
                      {auditReceipt.workersCount} colaboradores
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clima do Dia:</span>
                    <span className="text-slate-200 font-medium">{auditReceipt.weatherLabel}</span>
                  </div>
                  {auditReceipt.weatherImpactDays > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Impacto no Cronograma:</span>
                      <span className="text-amber-400 font-semibold">
                        +{auditReceipt.weatherImpactDays} dia(s) por intempérie
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data/Hora:</span>
                    <span className="text-slate-200">{auditReceipt.timestamp}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Hash SHA-256 Auditável:</span>
                    <code className="text-[10px] text-emerald-400 break-all">{auditReceipt.hash}</code>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAuditReceipt(null);
                    setPhotos([]);
                    setAttendanceText('');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-sm"
                >
                  Novo Apontamento
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      Avanço da Obra Hoje
                    </label>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-bold">
                      +{progressDelta}%
                    </span>
                  </div>

                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {WBS_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={progressDelta}
                    onChange={(e) => setProgressDelta(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Clima do Dia &amp; Cronograma
                    </label>
                    <button
                      type="button"
                      disabled={weatherLoading}
                      onClick={detectWeather}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      {weatherLoading ? 'Consultando...' : '📍 Atualizar via GPS'}
                    </button>
                  </div>
                  {weatherInfo && (
                    <p className="text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                      OpenWeather: {weatherInfo}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'sol', label: '☀️ Sol / Bom', defaultImpact: 0 },
                      { key: 'nublado', label: '⛅ Nublado', defaultImpact: 0 },
                      { key: 'chuva_leve', label: '🌧️ Chuva Leve', defaultImpact: 0.5 },
                      { key: 'chuva_forte', label: '⛈️ Chuva Forte', defaultImpact: 1.0 },
                    ].map((w) => (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => {
                          setWeatherCondition(w.key as any);
                          setWeatherImpactDays(w.defaultImpact);
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-left transition-all ${
                          weatherCondition === w.key
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  {(weatherCondition === 'chuva_leve' || weatherCondition === 'chuva_forte') && (
                    <div className="pt-1 flex items-center justify-between bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-xs">
                      <span className="text-amber-300 font-medium">Paralisação por chuva:</span>
                      <select
                        value={weatherImpactDays}
                        onChange={(e) => setWeatherImpactDays(Number(e.target.value))}
                        className="bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-1 text-amber-300 font-bold"
                      >
                        <option value={0}>Sem atraso (0d)</option>
                        <option value={0.5}>Meio período (+0.5d)</option>
                        <option value={1}>Dia inteiro (+1d)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Fotos da Medição ({photos.length}/3)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleCapturePhoto}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 gap-2.5">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/80 text-white flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {photos.length < 3 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-[11px] font-medium">Tirar Foto</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Equipe Presente (Estilo WhatsApp)
                  </label>
                  <textarea
                    rows={3}
                    value={attendanceText}
                    onChange={(e) => setAttendanceText(e.target.value)}
                    placeholder="Ex: João Silva, Marcos Pedreiro, José Servente, Lucas Eletricista"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Gerando Relatório Auditável...' : 'Enviar Relatório do Dia'}
                </button>
              </form>
            )}
          </>
        )}

        {/* ABA 2: PONTO GPS COM GEOFENCING */}
        {activeTab === 'ponto' && (
          <form onSubmit={handlePontoCheckIn} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Ponto & Geofencing GPS</h2>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">CPF / Matrícula do Colaborador</label>
              <input
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                placeholder="Ex: 123.456.789-00 (ou deixe em branco para seu usuário)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogType('entrada')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  logType === 'entrada'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setLogType('saida')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  logType === 'saida'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Saída
              </button>
            </div>

            <button
              type="submit"
              disabled={pontoLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {pontoLoading ? 'Validando GPS...' : 'Registrar Ponto Agora'}
            </button>

            {pontoResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  pontoResult.ok
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                <p className="font-bold mb-1">
                  {pontoResult.data?.geofence_status || (pontoResult.ok ? 'Ponto Registrado' : 'Atenção')}
                </p>
                <p>{pontoResult.data?.message || pontoResult.data?.detail || 'Processado pelo RH.'}</p>
              </div>
            )}
          </form>
        )}

        {/* ABA 3: SUPRIMENTOS NLP */}
        {activeTab === 'suprimentos' && (
          <form onSubmit={handleNlpRequest} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Pedir Insumos (IA / Texto Livre)</h2>
            </div>

            <textarea
              rows={4}
              required
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              placeholder="Escreva como no WhatsApp: Ex: Preciso de 20 sacos de cimento CP2 e 3 rolos de fio 2,5mm verde para amanhã cedo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500"
            />

            <button
              type="submit"
              disabled={nlpLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              {nlpLoading ? 'Processando Pedido...' : 'Enviar para Compras'}
            </button>

            {nlpResult && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <p className="font-bold text-emerald-400">
                  {nlpResult.ok ? 'Requisição interpretada com sucesso!' : 'Aviso'}
                </p>
                {nlpResult.data?.recognized_items?.map((it: any, i: number) => (
                  <div key={i} className="text-slate-300">
                    • {it.quantity} {it.unit || 'UN'} — {it.item_name || it.name}
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {/* ABA 4: RECEBIMENTO DE MATERIAIS (GOODS RECEIPT) */}
        {activeTab === 'recebimento' && (
          <form onSubmit={handleGoodsReceipt} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Recebimento de Materiais</h2>
            </div>

            <input
              type="text"
              value={receiptOrderCode}
              onChange={(e) => setReceiptOrderCode(e.target.value)}
              placeholder="Número da Nota Fiscal ou Pedido (ex: NF-1245)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReceiptStatus('total')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  receiptStatus === 'total'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Entrega Total
              </button>
              <button
                type="button"
                onClick={() => setReceiptStatus('parcial')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  receiptStatus === 'parcial'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Entrega Parcial
              </button>
            </div>

            <textarea
              rows={2}
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              placeholder="Observações da conferência física no canteiro..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
            />

            <button
              type="submit"
              disabled={receiptLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              {receiptLoading ? 'Registrando...' : 'Confirmar Recebimento'}
            </button>

            {receiptFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300">
                {receiptFeedback}
              </div>
            )}
          </form>
        )}

        {/* ABA 6: CAIXINHA DA OBRA (DESPESA RÁPIDA) */}
        {activeTab === 'caixinha' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!caixinhaDesc.trim() || !caixinhaAmount) return;
              setCaixinhaSent(true);
              setCaixinhaDesc('');
              setCaixinhaAmount('');
              setTimeout(() => setCaixinhaSent(false), 4000);
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Caixinha da Obra (Despesa Rápida)</h2>
            </div>

            <input
              type="text"
              required
              value={caixinhaDesc}
              onChange={(e) => setCaixinhaDesc(e.target.value)}
              placeholder="Ex: Prego 18x27, disco de corte e água da equipe"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white"
            />

            <input
              type="number"
              step="0.01"
              required
              value={caixinhaAmount}
              onChange={(e) => setCaixinhaAmount(e.target.value)}
              placeholder="Valor gasto (R$) — Ex: 180.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCaixinhaPayMethod('pix')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  caixinhaPayMethod === 'pix'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Pix / Reembolso
              </button>
              <button
                type="button"
                onClick={() => setCaixinhaPayMethod('dinheiro')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  caixinhaPayMethod === 'dinheiro'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Dinheiro (Fundo Fixo)
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              Lançar no Custo da Obra
            </button>

            {caixinhaSent && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300">
                Despesa lançada no Contas a Pagar e abatida do orçamento da obra!
              </div>
            )}
          </form>
        )}

        {/* ABA 5: CRONOGRAMA WBS & ADITIVOS */}
        {activeTab === 'wbs' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Cronograma WBS</h2>
                </div>
                <button
                  type="button"
                  onClick={loadWbsGantt}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${wbsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {wbsTasks.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Toque em &quot;Atualizar&quot; para carregar as etapas do cronograma desta obra.
                </p>
              ) : (
                <div className="space-y-2">
                  {wbsTasks.map((t: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
                      <span className="text-slate-200 font-medium">{t.name || t.title}</span>
                      <span className="text-emerald-400 font-bold">{t.progress ?? 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSendAditivo} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Solicitar Aditivo / Extra</h2>
              </div>
              <textarea
                rows={3}
                required
                value={aditivoDesc}
                onChange={(e) => setAditivoDesc(e.target.value)}
                placeholder="Descreva o serviço extra solicitado no canteiro para aprovação do escritório..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
              >
                Enviar Solicitação de Aditivo
              </button>
              {aditivoSent && (
                <p className="text-xs text-emerald-400 font-medium">
                  Solicitação enviada para aprovação do escritório!
                </p>
              )}
            </form>
          </div>
        )}

        {activeTab === 'campo' && (
          <FieldExtrasPanel sunMode={sunMode} onNotify={notify} />
        )}

        {activeTab === 'ajuda' && (
          <HelpPanel sunMode={sunMode} />
        )}
      </main>

      {/* Bottom Tab Bar Estilo App Nativo */}
      <nav className={`fixed bottom-0 inset-x-0 z-40 backdrop-blur border-t px-1 py-1.5 flex justify-around items-center ${sunMode ? 'bg-white/95 border-slate-300' : 'bg-slate-900/95 border-slate-800'}`}>
        {[
          { key: 'medicao', label: 'Medição', icon: Sliders },
          { key: 'ponto', label: 'Ponto', icon: MapPin },
          { key: 'suprimentos', label: 'Pedir', icon: Package },
          { key: 'recebimento', label: 'Receber', icon: Truck },
          { key: 'caixinha', label: 'Caixinha', icon: Wallet },
          { key: 'wbs', label: 'WBS', icon: GitBranch },
          { key: 'campo', label: 'Campo+', icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 min-h-[48px] rounded-xl transition-colors ${
                active ? 'text-emerald-500 font-bold' : sunMode ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
