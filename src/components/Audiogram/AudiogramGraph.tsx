import React from 'react';

// --- CONSTANTES AUDIOLÓGICAS (Padrão Clínico) ---
const LABELED_FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const LABELED_DBS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

// Frequências extras para grid intermediário (750, 1500 não recebem rótulo principal)
const INTERMEDIATE_FREQUENCIES = [750, 1500];
const ALL_SNAP_FREQUENCIES = [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

interface Point {
  freq: number;
  db: number;
}

interface AudiogramGraphProps {
  airPoints: Point[];
  bonePoints: Point[];
  refAirPoints?: Point[];  // <-- NOVO: Pontos de referência VA
  refBonePoints?: Point[]; // <-- NOVO: Pontos de referência VO
  ear: 'right' | 'left';
  onPlot?: (freq: number, db: number) => void;
  readonly?: boolean;
}

export function AudiogramGraph({
  airPoints,
  bonePoints,
  refAirPoints = [],  // Padrão vazio se não tiver referência
  refBonePoints = [], // Padrão vazio se não tiver referência
  ear,
  onPlot,
  readonly = false,
}: AudiogramGraphProps) {
  const width = 560;
  const height = 520;
  const padding = { top: 52, right: 30, bottom: 28, left: 52 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // --- ESCALA LOGARÍTMICA PARA FREQUÊNCIAS ---
  // Limites visuais: um pouco antes de 250 e um pouco depois de 8000
  const FREQ_MIN_LOG = Math.log10(200);
  const FREQ_MAX_LOG = Math.log10(10000);

  const getX = (freq: number) => {
    const logFreq = Math.log10(freq);
    const percent = (logFreq - FREQ_MIN_LOG) / (FREQ_MAX_LOG - FREQ_MIN_LOG);
    return padding.left + percent * graphWidth;
  };

  // --- ESCALA LINEAR PARA dB ---
  // Limites visuais: de -10 a 120 (com margem mínima para respiro)
  const DB_VISUAL_MIN = -15;
  const DB_VISUAL_MAX = 125;

  const getY = (db: number) => {
    const range = DB_VISUAL_MAX - DB_VISUAL_MIN;
    const percent = (db - DB_VISUAL_MIN) / range;
    return padding.top + percent * graphHeight;
  };

  // --- CORES CLÍNICAS ---
  const color = ear === 'right' ? '#CC0000' : '#0044CC';
  const lineColor = ear === 'right' ? '#CC0000' : '#0044CC';

  // --- CLICK HANDLER ---
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly || !onPlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Snap frequência
    let closestFreq = ALL_SNAP_FREQUENCIES[0];
    let minDistX = Infinity;
    ALL_SNAP_FREQUENCIES.forEach((f) => {
      const dist = Math.abs(getX(f) - clickX);
      if (dist < minDistX) {
        minDistX = dist;
        closestFreq = f;
      }
    });

    // Snap dB (passos de 5)
    const rangeDb = DB_VISUAL_MAX - DB_VISUAL_MIN;
    const dbRaw = ((clickY - padding.top) / graphHeight) * rangeDb + DB_VISUAL_MIN;
    const closestDb = Math.round(dbRaw / 5) * 5;

    if (closestDb >= -10 && closestDb <= 120) {
      onPlot(closestFreq, closestDb);
    }
  };

  // --- LINHA DA VIA AÉREA ---
  const sortedAir = [...airPoints].sort((a, b) => a.freq - b.freq);
  const pathAir = sortedAir
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`)
    .join(' ');

  // --- LINHA DA VIA ÓSSEA ---
  const sortedBone = [...bonePoints].sort((a, b) => a.freq - b.freq);
  const pathBone = sortedBone
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`)
    .join(' ');

  // --- LINHA DE REFERÊNCIA (VIA AÉREA ANTIGA) ---
  const sortedRefAir = [...refAirPoints].sort((a, b) => a.freq - b.freq);
  const pathRefAir = sortedRefAir
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`)
    .join(' ');

  // --- LINHA DE REFERÊNCIA (VIA ÓSSEA ANTIGA) ---
  const sortedRefBone = [...refBonePoints].sort((a, b) => a.freq - b.freq);
  const pathRefBone = sortedRefBone
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`)
    .join(' ');

  // Formatar rótulo de frequência
  const formatFreq = (freq: number) => {
    if (freq >= 1000) {
      const k = freq / 1000;
      return Number.isInteger(k) ? `${k}000` : `${freq}`;
    }
    return `${freq}`;
  };

  // Título
  const title = ear === 'right' ? 'ORELHA DIREITA' : 'ORELHA ESQUERDA';

  return (
    <div className="select-none relative w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleClick}
        className={`w-full max-w-[560px] ${!readonly ? 'cursor-crosshair' : ''}`}
        style={{
          touchAction: 'none',
          background: '#FFFFFF',
          border: '1.5px solid #999',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
        }}
      >
        {/* === TÍTULO === */}
        <text
          x={width / 2}
          y={20}
          textAnchor="middle"
          fontSize="13"
          fontWeight="bold"
          fill="#222"
          style={{ fontFamily: "'Arial', sans-serif", letterSpacing: '0.5px' }}
        >
          {title}
        </text>

        {/* === RÓTULO FREQUÊNCIAS NO TOPO === */}
        {LABELED_FREQUENCIES.map((freq) => (
          <text
            key={`freq-label-${freq}`}
            x={getX(freq)}
            y={padding.top - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#333"
            fontWeight="600"
            style={{ fontFamily: "'Arial', sans-serif" }}
          >
            {formatFreq(freq)}
          </text>
        ))}

        {/* Rótulo "Hz" no canto superior direito */}
        <text
          x={width - padding.right + 8}
          y={padding.top - 8}
          textAnchor="start"
          fontSize="9"
          fill="#666"
          style={{ fontFamily: "'Arial', sans-serif" }}
        >
          Hz
        </text>

        {/* === BORDA DO GRÁFICO === */}
        <rect
          x={padding.left}
          y={padding.top}
          width={graphWidth}
          height={graphHeight}
          fill="none"
          stroke="#666"
          strokeWidth="1.5"
        />

        {/* === LINHAS HORIZONTAIS (dB) === */}
        {LABELED_DBS.map((db) => (
          <g key={`db-${db}`}>
            <line
              x1={padding.left}
              y1={getY(db)}
              x2={padding.left + graphWidth}
              y2={getY(db)}
              stroke={db === 0 ? '#444' : '#ccc'}
              strokeWidth={db === 0 ? 1.5 : 0.7}
            />
            <text
              x={padding.left - 8}
              y={getY(db) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="#333"
              fontWeight={db === 0 ? 'bold' : 'normal'}
              style={{ fontFamily: "'Arial', sans-serif" }}
            >
              {db}
            </text>
          </g>
        ))}

        {/* === LINHAS VERTICAIS (Frequências principais) === */}
        {LABELED_FREQUENCIES.map((freq) => (
          <line
            key={`vline-${freq}`}
            x1={getX(freq)}
            y1={padding.top}
            x2={getX(freq)}
            y2={padding.top + graphHeight}
            stroke="#ccc"
            strokeWidth={0.7}
          />
        ))}

        {/* Linhas verticais intermediárias (tracejadas) */}
        {INTERMEDIATE_FREQUENCIES.map((freq) => (
          <line
            key={`vline-int-${freq}`}
            x1={getX(freq)}
            y1={padding.top}
            x2={getX(freq)}
            y2={padding.top + graphHeight}
            stroke="#ddd"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        ))}

        {/* === FAIXAS DE CLASSIFICAÇÃO (cores de fundo sutis) === */}
        <rect x={padding.left} y={getY(-10)} width={graphWidth} height={getY(25) - getY(-10)} fill="#e8f5e9" opacity={0.3} />
        <rect x={padding.left} y={getY(25)} width={graphWidth} height={getY(40) - getY(25)} fill="#fff9c4" opacity={0.25} />
        <rect x={padding.left} y={getY(40)} width={graphWidth} height={getY(55) - getY(40)} fill="#ffe0b2" opacity={0.25} />
        <rect x={padding.left} y={getY(55)} width={graphWidth} height={getY(70) - getY(55)} fill="#ffccbc" opacity={0.25} />
        <rect x={padding.left} y={getY(70)} width={graphWidth} height={getY(90) - getY(70)} fill="#ef9a9a" opacity={0.2} />
        <rect x={padding.left} y={getY(90)} width={graphWidth} height={getY(120) - getY(90)} fill="#e57373" opacity={0.15} />

        {/* Rótulos de classificação na lateral direita */}
        {[
          { label: 'Normal', y: (-10 + 25) / 2 },
          { label: 'Leve', y: (25 + 40) / 2 },
          { label: 'Moderada', y: (40 + 55) / 2 },
          { label: 'Mod. Severa', y: (55 + 70) / 2 },
          { label: 'Severa', y: (70 + 90) / 2 },
          { label: 'Profunda', y: (90 + 120) / 2 },
        ].map(({ label, y }) => (
          <text
            key={`class-${label}`}
            x={padding.left + graphWidth - 4}
            y={getY(y) + 3}
            textAnchor="end"
            fontSize="7.5"
            fill="#888"
            opacity={0.7}
            style={{ fontFamily: "'Arial', sans-serif", fontStyle: 'italic' }}
          >
            {label}
          </text>
        ))}

        {/* ========================================================= */}
        {/* === CAMADA 0: REFERÊNCIA (GHOST LINES) ================== */}
        {/* ========================================================= */}
        
        {/* Ghost Line - Via Aérea */}
        {refAirPoints.length > 0 && (
          <g opacity={0.35} style={{ pointerEvents: 'none' }}>
            {sortedRefAir.length > 1 && (
              <path
                d={pathRefAir}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinejoin="round"
              />
            )}
            {refAirPoints.map((p) => (
              <g key={`ref-air-${p.freq}`}>
                {ear === 'right' ? (
                  <circle cx={getX(p.freq)} cy={getY(p.db)} r={6} stroke={color} strokeWidth="2" fill="white" />
                ) : (
                  <g>
                    <line x1={getX(p.freq) - 5} y1={getY(p.db) - 5} x2={getX(p.freq) + 5} y2={getY(p.db) + 5} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1={getX(p.freq) + 5} y1={getY(p.db) - 5} x2={getX(p.freq) - 5} y2={getY(p.db) + 5} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                )}
              </g>
            ))}
          </g>
        )}

        {/* Ghost Line - Via Óssea */}
        {refBonePoints.length > 0 && (
          <g opacity={0.35} style={{ pointerEvents: 'none' }}>
            {sortedRefBone.length > 1 && (
              <path
                d={pathRefBone}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinejoin="round"
              />
            )}
            {refBonePoints.map((p) => (
              <g key={`ref-bone-${p.freq}`}>
                {ear === 'right' ? (
                  <g>
                    <line x1={getX(p.freq) + 3} y1={getY(p.db) - 6} x2={getX(p.freq) - 5} y2={getY(p.db)} stroke={color} strokeWidth="2" strokeLinecap="round" />
                    <line x1={getX(p.freq) - 5} y1={getY(p.db)} x2={getX(p.freq) + 3} y2={getY(p.db) + 6} stroke={color} strokeWidth="2" strokeLinecap="round" />
                  </g>
                ) : (
                  <g>
                    <line x1={getX(p.freq) - 3} y1={getY(p.db) - 6} x2={getX(p.freq) + 5} y2={getY(p.db)} stroke={color} strokeWidth="2" strokeLinecap="round" />
                    <line x1={getX(p.freq) + 5} y1={getY(p.db)} x2={getX(p.freq) - 3} y2={getY(p.db) + 6} stroke={color} strokeWidth="2" strokeLinecap="round" />
                  </g>
                )}
              </g>
            ))}
          </g>
        )}

        {/* ========================================================= */}
        {/* === CAMADA 1: LINHAS ATUAIS ============================= */}
        {/* ========================================================= */}

        {/* === LINHA DA VIA ÓSSEA === */}
        {sortedBone.length > 1 && (
          <path
            d={pathBone}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeDasharray="6 3"
            strokeLinejoin="round"
          />
        )}

        {/* === LINHA DA VIA AÉREA === */}
        {sortedAir.length > 1 && (
          <path
            d={pathAir}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* ========================================================= */}
        {/* === CAMADA 2: PONTOS ATUAIS ============================= */}
        {/* ========================================================= */}

        {/* === PONTOS VIA AÉREA === */}
        {airPoints.map((p) => (
          <g key={`air-${p.freq}`}>
            {ear === 'right' ? (
              /* Orelha Direita: Círculo (O) — padrão ASHA */
              <circle
                cx={getX(p.freq)}
                cy={getY(p.db)}
                r={6}
                stroke={color}
                strokeWidth="2"
                fill="white"
              />
            ) : (
              /* Orelha Esquerda: X — padrão ASHA */
              <g>
                <line
                  x1={getX(p.freq) - 5}
                  y1={getY(p.db) - 5}
                  x2={getX(p.freq) + 5}
                  y2={getY(p.db) + 5}
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1={getX(p.freq) + 5}
                  y1={getY(p.db) - 5}
                  x2={getX(p.freq) - 5}
                  y2={getY(p.db) + 5}
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            )}
            {/* Hitbox para facilitar toque */}
            <circle
              cx={getX(p.freq)}
              cy={getY(p.db)}
              r={14}
              fill="transparent"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ))}

        {/* === PONTOS VIA ÓSSEA === */}
        {bonePoints.map((p) => (
          <g key={`bone-${p.freq}`}>
            {ear === 'right' ? (
              /* Orelha Direita: < (colchete aberto para a esquerda) */
              <g>
                <line
                  x1={getX(p.freq) + 3}
                  y1={getY(p.db) - 6}
                  x2={getX(p.freq) - 5}
                  y2={getY(p.db)}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={getX(p.freq) - 5}
                  y1={getY(p.db)}
                  x2={getX(p.freq) + 3}
                  y2={getY(p.db) + 6}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              /* Orelha Esquerda: > (colchete aberto para a direita) */
              <g>
                <line
                  x1={getX(p.freq) - 3}
                  y1={getY(p.db) - 6}
                  x2={getX(p.freq) + 5}
                  y2={getY(p.db)}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={getX(p.freq) + 5}
                  y1={getY(p.db)}
                  x2={getX(p.freq) - 3}
                  y2={getY(p.db) + 6}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            )}
            <circle
              cx={getX(p.freq)}
              cy={getY(p.db)}
              r={14}
              fill="transparent"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ))}

        {/* === LEGENDA === */}
        <g transform={`translate(${padding.left + 6}, ${padding.top + graphHeight - 50})`} opacity={0.6}>
          {/* Via Aérea */}
          <line x1={0} y1={0} x2={18} y2={0} stroke={lineColor} strokeWidth="2" />
          {ear === 'right' ? (
            <circle cx={9} cy={0} r={4} stroke={color} strokeWidth="1.5" fill="white" />
          ) : (
            <g>
              <line x1={6} y1={-3} x2={12} y2={3} stroke={color} strokeWidth="1.5" />
              <line x1={12} y1={-3} x2={6} y2={3} stroke={color} strokeWidth="1.5" />
            </g>
          )}
          <text x={24} y={3.5} fontSize="8" fill="#555" style={{ fontFamily: "'Arial', sans-serif" }}>
            Via Aérea
          </text>

          {/* Via Óssea */}
          <line x1={0} y1={16} x2={18} y2={16} stroke={lineColor} strokeWidth="1.5" strokeDasharray="4 2" />
          {ear === 'right' ? (
            <g>
              <line x1={11} y1={12} x2={5} y2={16} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
              <line x1={5} y1={16} x2={11} y2={20} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <line x1={6} y1={12} x2={12} y2={16} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
              <line x1={12} y1={16} x2={6} y2={20} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
          <text x={24} y={19.5} fontSize="8" fill="#555" style={{ fontFamily: "'Arial', sans-serif" }}>
            Via Óssea
          </text>
        </g>
      </svg>
    </div>
  );
}
