'use client';

import {
  HelpCircle,
  Sliders,
  MapPin,
  Package,
  Truck,
  Wallet,
  GitBranch,
  Wrench,
  WifiOff,
  Smartphone,
  Sun,
} from 'lucide-react';

export function HelpPanel({ sunMode }: { sunMode: boolean }) {
  const cardClass = sunMode
    ? 'bg-white border-slate-300 text-slate-900'
    : 'bg-slate-900/80 border-slate-800 text-slate-100';

  const mutedClass = sunMode ? 'text-slate-600' : 'text-slate-400';

  const sections = [
    {
      icon: Sliders,
      title: 'Medição do Dia',
      desc: 'Registre o avanço físico da etapa WBS, selecione ou detecte o clima via GPS e informe o impacto no cronograma.',
    },
    {
      icon: MapPin,
      title: 'Ponto GPS',
      desc: 'Bata o ponto da equipe com geolocalização automática para comprovação de presença no canteiro.',
    },
    {
      icon: Package,
      title: 'Pedir (Suprimentos)',
      desc: 'Solicite materiais rapidamente usando linguagem natural para agilizar o pedido junto ao setor de compras.',
    },
    {
      icon: Truck,
      title: 'Receber (Materiais)',
      desc: 'Confira entregas no canteiro, registre divergências e colete a assinatura digital na aba Campo+.',
    },
    {
      icon: Wallet,
      title: 'Caixinha',
      desc: 'Controle pequenas despesas de campo com registro rápido de valores e justificativas.',
    },
    {
      icon: GitBranch,
      title: 'WBS & Aditivos',
      desc: 'Acompanhe as etapas da obra e solicite ou consulte aditivos de escopo diretamente do campo.',
    },
    {
      icon: Wrench,
      title: 'Campo+ (RDO, SST, RNC e Voz)',
      desc: 'Tire fotos com marca d’água GPS automática, dite observações por voz, preencha o checklist SST/DDS, colete assinatura digital e compartilhe o resumo no WhatsApp.',
    },
  ];

  return (
    <div className="space-y-4 pb-24">
      <div className={`p-4 rounded-2xl border ${cardClass}`}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-500" />
          Central de Ajuda — GADAP Field
        </h2>
        <p className={`text-sm mt-1 ${mutedClass}`}>
          Guia rápido para mestres de obras, engenheiros e apontadores no canteiro.
        </p>
      </div>

      <div className="space-y-2.5">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className={`p-3.5 rounded-2xl border flex gap-3 ${cardClass}`}>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 h-fit shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className={`text-xs mt-0.5 leading-relaxed ${mutedClass}`}>{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-500" />
          Uso Offline & Sincronização
        </h3>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>
          Sem sinal no canteiro? Seus registros em <strong>Campo+</strong> ficam salvos na fila local. Assim que a internet voltar, o app sincroniza automaticamente (ou toque no botão de pendências no topo).
        </p>

        <h3 className="font-bold text-sm flex items-center gap-2 pt-1">
          <Sun className="w-4 h-4 text-amber-400" />
          Modo Sol Forte
        </h3>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>
          Toque em <strong>Sol / Escuro</strong> na barra superior para alternar para alto contraste sob luz solar direta.
        </p>

        <h3 className="font-bold text-sm flex items-center gap-2 pt-1">
          <Smartphone className="w-4 h-4 text-sky-400" />
          Instalar no Celular
        </h3>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>
          No Android (Chrome), toque em <strong>Instalar App</strong> no topo ou no menu do navegador. No iPhone (Safari), toque em <strong>Compartilhar → Adicionar à Tela de Início</strong>.
        </p>
      </div>
    </div>
  );
}
