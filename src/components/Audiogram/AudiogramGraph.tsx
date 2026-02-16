
import React from 'react';
import { Text } from '@mantine/core';

// --- CONSTANTES AUDIOLÓGICAS ---
const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const DBS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

interface Point {
  freq: number;
  db: number;
}

interface AudiogramGraphProps {
  points: Point[];
  ear: 'right' | 'left'; // Define cor (Vermelho/Azul)
  conduction: 'air' | 'bone'; // Define símbolo (O/X ou </>)
  onPlot: (freq: number, db: number) => void;
  readonly?: boolean; // Para quando for apenas visualização (ex: no laudo)
}

export function AudiogramGraph({ 
  points, 
  ear, 
  conduction, 
  onPlot, 
  readonly = false 
}: AudiogramGraphProps) {
  
  // Dimensões do Canvas SVG
  const width = 600;
  const height = 400;
  const padding = { top: 40, right: 30, bottom: 40, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // --- ESCALAS (Matemática de Plotagem) ---
  
  // Converte Frequência (Hz) em Posição X (px)
  const getX = (freq: number) => {
    const index = FREQUENCIES.indexOf(freq);
    // Se a frequência não estiver na lista padrão (ex: 125Hz), ignora ou aproxima
    if (index === -1) return padding.left; 
    return padding.left + (index * (graphWidth / (FREQUENCIES.length - 1)));
  };

  // Converte Decibéis (dB) em Posição Y (px)
  const getY = (db: number) => {
    // Normaliza range de -10 a 120
    const minDb = -10;
    const maxDb = 120;
    const range = maxDb - minDb;
    const normalized = db - minDb;
    return padding.top + (normalized / range) * graphHeight;
  };

  // Cor baseada na orelha
  const color = ear === 'right' ? '#EF4444' : '#3B82F6'; // Tailwind Red-500 / Blue-500

  // --- INTERAÇÃO (CLIQUE) ---
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // Coordenadas relativas ao SVG (considerando responsividade)
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. "Snap" para a Frequência mais próxima (Eixo X)
    let closestFreq = FREQUENCIES[0];
    let minDistX = Infinity;

    FREQUENCIES.forEach(f => {
      const x = getX(f);
      const dist = Math.abs(x - clickX);
      if (dist < minDistX) {
        minDistX = dist;
        closestFreq = f;
      }
    });

    // 2. "Snap" para o dB mais próximo (Eixo Y - Passos de 5dB)
    const relativeY = clickY - padding.top;
    const rangeDb = 130; // 120 - (-10)
    const dbRaw = (relativeY / graphHeight) * rangeDb - 10;
    
    // Arredonda para múltiplo de 5 (ex: 13 vira 15, 12 vira 10)
    const closestDb = Math.round(dbRaw / 5) * 5;

    // Validação de Limites
    if (closestDb >= -10 && closestDb <= 120) {
      onPlot(closestFreq, closestDb);
    }
  };

  // Preparar linha de conexão (Apenas VA costuma ter linha contínua)
  const sortedPoints = [...points].sort((a, b) => a.freq - b.freq);
  const pathD = sortedPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(p.freq)} ${getY(p.db)}`
  ).join(' ');

  return (
    <div className="select-none relative w-full flex flex-col items-center">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        onClick={handleClick}
        className={`bg-white rounded-lg shadow-sm border border-slate-200 w-full max-w-[600px] ${!readonly ? 'cursor-crosshair hover:bg-slate-50 transition-colors' : ''}`}
        style={{ touchAction: 'none' }} // Melhora toque em mobile/tablet
      >
        {/* --- GRID (FUNDO) --- */}
        
        {/* Linhas Horizontais (dB) */}
        {DBS.map(db => (
          <g key={db}>
            <line 
              x1={padding.left} y1={getY(db)} 
              x2={width - padding.right} y2={getY(db)} 
              stroke="#e2e8f0" 
              strokeWidth={db === 0 ? 2 : 1} // Linha do 0dB mais grossa
            />
            <text 
              x={padding.left - 10} 
              y={getY(db) + 4} 
              textAnchor="end" 
              fontSize="12" 
              fontWeight={db === 0 ? 'bold' : 'normal'}
              fill="#64748b"
              className="font-mono"
            >
              {db}
            </text>
          </g>
        ))}

        {/* Linhas Verticais (Hz) */}
        {FREQUENCIES.map(freq => (
          <g key={freq}>
            <line 
              x1={getX(freq)} y1={padding.top} 
              x2={getX(freq)} y2={height - padding.bottom} 
              stroke="#e2e8f0" 
              strokeDasharray="4 4" 
            />
            <text 
              x={getX(freq)} 
              y={padding.top - 15} 
              textAnchor="middle" 
              fontSize="12" 
              fontWeight="bold"
              fill="#64748b"
            >
              {freq < 1000 ? freq : `${freq/1000}k`}
            </text>
          </g>
        ))}

        {/* --- DADOS (PLOTAGEM) --- */}

        {/* Linha Conectora (Apenas Via Aérea) */}
        {conduction === 'air' && (
          <path 
            d={pathD} 
            fill="none" 
            stroke={color} 
            strokeWidth="2" 
            strokeLinejoin="round"
          />
        )}

        {/* Símbolos dos Pontos */}
        {points.map((p, index) => {
          const cx = getX(p.freq);
          const cy = getY(p.db);
          const key = `${p.freq}-${p.db}`;
          
          return (
            <g key={key} className="transition-all duration-300 ease-out animate-pop">
              
              {/* ORELHA DIREITA (Vermelho) */}
              {ear === 'right' && (
                conduction === 'air' 
                  ? (
                    // Círculo (O)
                    <circle cx={cx} cy={cy} r={5} stroke={color} strokeWidth="2.5" fill="white" /> 
                  )
                  : (
                    // Símbolo (<)
                    <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="20" fontWeight="bold" style={{ fontFamily: 'Arial' }}>
                      &lt;
                    </text>
                  )
              )}

              {/* ORELHA ESQUERDA (Azul) */}
              {ear === 'left' && (
                 conduction === 'air' 
                  ? (
                    // Xis (X)
                    <g stroke={color} strokeWidth="2.5">
                      <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} />
                      <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} />
                    </g>
                  )
                  : (
                    // Símbolo (>)
                    <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="20" fontWeight="bold" style={{ fontFamily: 'Arial' }}>
                      &gt;
                    </text>
                  )
              )}

              {/* "Hitbox" invisível maior para facilitar remoção futura ou hover */}
              <circle cx={cx} cy={cy} r={15} fill="transparent" />
            </g>
          );
        })}
      </svg>
      
      {/* Legenda de Eixos */}
      <div className="flex justify-between w-full max-w-[600px] px-8 mt-1 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        <span>Intensidade (dB HL)</span>
        <span>Frequência (Hz)</span>
      </div>
    </div>
  );
}