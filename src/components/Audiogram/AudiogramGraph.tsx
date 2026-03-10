import React from 'react';

// --- CONSTANTES AUDIOLÓGICAS ---
const FREQUENCIES = [250, 500, 750,1000,1500, 2000, 3000, 4000, 6000, 8000];
const DBS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

interface Point {
  freq: number;
  db: number;
}

interface AudiogramGraphProps {
  airPoints: Point[];   // Pontos da Via Aérea
  bonePoints: Point[];  // Pontos da Via Óssea
  ear: 'right' | 'left';
  onPlot: (freq: number, db: number) => void;
  readonly?: boolean;
}

export function AudiogramGraph({ 
  airPoints, 
  bonePoints, 
  ear, 
  onPlot, 
  readonly = false 
}: AudiogramGraphProps) {
  
  // Dimensões
  const width = 600;
  const height = 400;
  const padding = { top: 40, right: 30, bottom: 40, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // --- ESCALAS ---
  const getX = (freq: number) => {
    const index = FREQUENCIES.indexOf(freq);
    if (index === -1) return padding.left; 
    return padding.left + (index * (graphWidth / (FREQUENCIES.length - 1)));
  };

  const getY = (db: number) => {
    const minDb = -10;
    const maxDb = 120;
    const range = maxDb - minDb;
    const normalized = db - minDb;
    return padding.top + (normalized / range) * graphHeight;
  };

  const color = ear === 'right' ? '#EF4444' : '#3B82F6'; // Vermelho / Azul

  // --- INTERAÇÃO ---
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Snap Frequência
    let closestFreq = FREQUENCIES[0];
    let minDistX = Infinity;
    FREQUENCIES.forEach(f => {
      const dist = Math.abs(getX(f) - clickX);
      if (dist < minDistX) {
        minDistX = dist;
        closestFreq = f;
      }
    });

    // Snap dB (Passos de 5dB)
    const relativeY = clickY - padding.top;
    const rangeDb = 130;
    const dbRaw = (relativeY / graphHeight) * rangeDb - 10;
    const closestDb = Math.round(dbRaw / 5) * 5;

    if (closestDb >= -10 && closestDb <= 120) {
      onPlot(closestFreq, closestDb);
    }
  };

  // Linha de Conexão (Apenas para Via Aérea)
  const sortedAir = [...airPoints].sort((a, b) => a.freq - b.freq);
  const pathAir = sortedAir.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`
  ).join(' ');

  // Ordenar Óssea (se quiséssemos linha tracejada futura, mas por padrão óssea não tem linha ou é tracejada)
  // const sortedBone = [...bonePoints].sort((a, b) => a.freq - b.freq);

  return (
    <div className="select-none relative w-full flex flex-col items-center">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        onClick={handleClick}
        className={`bg-white rounded-lg shadow-sm border border-slate-200 w-full max-w-[600px] ${!readonly ? 'cursor-crosshair' : ''}`}
        style={{ touchAction: 'none' }}
      >
        {/* GRID */}
        {DBS.map(db => (
          <g key={db}>
            <line x1={padding.left} y1={getY(db)} x2={width - padding.right} y2={getY(db)} stroke="#e2e8f0" strokeWidth={db === 0 ? 2 : 1} />
            <text x={padding.left - 10} y={getY(db) + 4} textAnchor="end" fontSize="12" fill="#64748b" fontWeight={db === 0 ? 'bold' : 'normal'}>{db}</text>
          </g>
        ))}
        {FREQUENCIES.map(freq => (
          <g key={freq}>
            <line x1={getX(freq)} y1={padding.top} x2={getX(freq)} y2={height - padding.bottom} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={getX(freq)} y={padding.top - 15} textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="bold">
              {freq < 1000 ? freq : `${freq/1000}k`}
            </text>
          </g>
        ))}

        {/* CAMADA 1: LINHA DA VIA AÉREA (Sempre visível) */}
        <path d={pathAir} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

        {/* CAMADA 2: PONTOS VIA AÉREA (Círculo ou X) */}
        {airPoints.map((p) => (
          <g key={`air-${p.freq}`}>
            {ear === 'right' ? (
              <circle cx={getX(p.freq)} cy={getY(p.db)} r={5} stroke={color} strokeWidth="2.5" fill="white" />
            ) : (
              <g stroke={color} strokeWidth="2.5">
                <line x1={getX(p.freq) - 4} y1={getY(p.db) - 4} x2={getX(p.freq) + 4} y2={getY(p.db) + 4} />
                <line x1={getX(p.freq) + 4} y1={getY(p.db) - 4} x2={getX(p.freq) - 4} y2={getY(p.db) + 4} />
              </g>
            )}
             {/* Hitbox invisível para facilitar clique/remoção */}
             <circle cx={getX(p.freq)} cy={getY(p.db)} r={12} fill="transparent" />
          </g>
        ))}

        {/* CAMADA 3: PONTOS VIA ÓSSEA (< ou >) */}
        {bonePoints.map((p) => (
          <g key={`bone-${p.freq}`}>
            <text 
              x={getX(p.freq)} 
              y={getY(p.db) + 5} 
              textAnchor="middle" 
              fill={color} 
              fontSize="20" 
              fontWeight="bold" 
              style={{ fontFamily: 'Arial' }}
            >
              {ear === 'right' ? '<' : '>'}
            </text>
             {/* Hitbox invisível */}
             <circle cx={getX(p.freq)} cy={getY(p.db)} r={12} fill="transparent" />
          </g>
        ))}

      </svg>
      
      <div className="flex justify-between w-full max-w-[600px] px-8 mt-1 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        <span>Intensidade (dB HL)</span>
        <span>Frequência (Hz)</span>
      </div>
    </div>
  );
}