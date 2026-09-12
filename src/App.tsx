import React, { useState, useEffect, Component } from 'react';
import { 
  Flame, Droplets, Zap, Plus, Minus, RefreshCcw, ChevronRight, CheckCircle2, 
  Pause, Play, RotateCcw, Database, Crosshair, Activity, ShieldAlert, 
  Settings, Wind, ChevronLeft, Eye, Map as MapIcon, Thermometer, Users, AlertTriangle, 
  StopCircle, CheckSquare, DoorClosed, ClipboardList, X, ArrowUp, ArrowRight, 
  ArrowDown, History, Moon, Compass, FileText, Ruler, Calculator, Square, Circle, BoxSelect,
  ArrowDownToLine, ArrowUpFromLine, Info, Home, MapPin, Navigation
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- CONSTANTES ---
const PRESET_FLOW_RATES = [100, 200, 250, 300, 400, 500];
const PRESET_CONCENTRATIONS = [0.1, 0.5, 1, 3, 6];
const EXPANSION_RATES = [
  { label: 'Bas (Lance)', value: 10 },
  { label: 'Moyen (Lance)', value: 50 },
  { label: 'HF Batfan', value: 250 },
  { label: 'HF MT296', value: 800 }
];

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-black uppercase mb-2">Une erreur est survenue</h1>
          <p className="text-white/60 mb-8 max-w-md">L'application a rencontré un problème inattendu. Vos données ont été préservées.</p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest"
          >
            Réinitialiser l'App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- HELPERS ---
const loadPersistedState = (key: string) => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
           if (parsed.lastTimestamp && (parsed.isTimerActive || parsed.isVentilating)) {
             const diff = Math.floor((Date.now() - parsed.lastTimestamp) / 1000);
             // Ensure elapsedSeconds is a number and not NaN
             const currentElapsed = (typeof parsed.elapsedSeconds === 'number' && !isNaN(parsed.elapsedSeconds)) ? parsed.elapsedSeconds : 0;
             parsed.elapsedSeconds = Math.max(0, currentElapsed + diff);
             parsed.timeDiff = diff; // Store diff for other components to use
           }
           return parsed;
        }
      } catch (parseError) {
        console.error(`Error parsing state for ${key}:`, parseError);
        return null;
      }
    }
  } catch (e) { console.error(`Error loading state for ${key}:`, e); }
  return null;
};

// --- COMPOSANTS UI REUTILISABLES ---
const FireHydrant = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 22h14" /><path d="M12 22V7" /><path d="M12 7a5 5 0 0 1 5 5v3H7v-3a5 5 0 0 1 5-5z" /><path d="M9 3h6" /><path d="M12 7V3" /><path d="M7 15H4v-4h3" /><path d="M17 15h3v-4h-3" /><circle cx="12" cy="12" r="1" />
  </svg>
);

const SegmentedGauge = ({ value, max, color = 'blue' }: { value: number; max: number; color?: 'blue' | 'green' | 'orange' | 'red' }) => {
  const safeValue = isNaN(value) ? 0 : value;
  const safeMax = isNaN(max) || max === 0 ? 1 : max;
  const percent = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
  const segments = 12; 
  const activeSegments = Math.round((percent / 100) * segments);
  const colors = {
    blue: 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]',
    green: 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]',
    orange: 'bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.8)]',
    red: 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse'
  };

  return (
    <div className="relative flex flex-col-reverse w-full h-full gap-1 bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-inner">
      <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
        <div className="w-1.5 h-[1px] bg-white/30" />
      </div>
      {[...Array(segments)].map((_, i) => (
        <div key={i} className={`flex-1 rounded-[1px] transition-all duration-700 ${i < activeSegments ? colors[color] : 'bg-white/5 border border-white/5'}`} />
      ))}
    </div>
  );
};

const safeFormatTime = (s: number) => {
  if (!isFinite(s) || isNaN(s) || s < 0) return "00:00";
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
};

// ==========================================
// MODULE 1 : CALCULATEUR MOUSSE
// ==========================================
function FoamApp({ onBack, onHome }: { onBack: () => void, onHome: () => void }) {
  const savedState = React.useRef(loadPersistedState('sdis77_foam_state')).current;
  const [mode, setMode] = useState<'setup' | 'operational' | 'report'>(savedState?.mode || 'setup'); 
  const [concentration, setConcentration] = useState(savedState?.concentration || 1);
  const [flowRate, setFlowRate] = useState(savedState?.flowRate || 300);
  const [expansionRate, setExpansionRate] = useState(savedState?.expansionRate || 250); 
  const [elapsedSeconds, setElapsedSeconds] = useState(savedState?.elapsedSeconds || 0);
  const [cumulativeWater, setCumulativeWater] = useState(savedState?.cumulativeWater || 0);
  const [isTimerActive, setIsTimerActive] = useState(savedState?.isTimerActive || false);
  const [foamStartTime, setFoamStartTime] = useState<number | null>(savedState?.foamStartTime || null);
  const [emulseurType, setEmulseurType] = useState<'biofor' | 'ecopol'>(savedState?.emulseurType || 'ecopol');
  const [targetDecantation, setTargetDecantation] = useState<number>(savedState?.targetDecantation || 25);
  const [showCOSModal, setShowCOSModal] = useState(false);
  const [hasShown3MinWarning, setHasShown3MinWarning] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDecantInfo, setShowDecantInfo] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [consumptionHistory, setConsumptionHistory] = useState<{ time: string, eau: number, mousse: number }[]>(savedState?.consumptionHistory || []);

  // Persistance de l'état
  useEffect(() => {
    localStorage.setItem('sdis77_foam_state', JSON.stringify({
      mode, concentration, flowRate, expansionRate, elapsedSeconds, cumulativeWater, isTimerActive, foamStartTime, consumptionHistory, emulseurType, targetDecantation, lastTimestamp: Date.now()
    }));
  }, [mode, concentration, flowRate, expansionRate, elapsedSeconds, cumulativeWater, isTimerActive, foamStartTime, consumptionHistory, emulseurType, targetDecantation]);

  const [stock, setStock] = useState(() => {
    try {
      const saved = localStorage.getItem('sdis77_foam_stock_v2');
      let initialStock = { water: 3000, foam: 200, maxWater: 3000, maxFoam: 200, isWaterSupplied: false };
      
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed && typeof parsed === 'object' &&
          typeof parsed.water === 'number' &&
          typeof parsed.foam === 'number' &&
          typeof parsed.maxWater === 'number' &&
          typeof parsed.maxFoam === 'number' &&
          typeof parsed.isWaterSupplied === 'boolean'
        ) {
          initialStock = parsed;
        }
      }

      // CATCH-UP LOGIC: Apply consumption during downtime if timer was active
      if (savedState?.isTimerActive && savedState?.timeDiff && savedState.timeDiff > 0) {
        const diff = savedState.timeDiff;
        const savedFlow = savedState.flowRate || 300;
        const savedConc = savedState.concentration || 1;
        
        const actualFoamFlow = (savedConc / 100) * savedFlow;
        const actualWaterFlow = savedFlow - actualFoamFlow;

        // Apply consumption
        initialStock.water = initialStock.isWaterSupplied ? initialStock.water : Math.max(0, initialStock.water - (actualWaterFlow * diff / 60));
        initialStock.foam = Math.max(0, initialStock.foam - (actualFoamFlow * diff / 60));
        
        // Catch up cumulative water (needs to be done in the state init or effect, but here we only touch stock)
        // We handle cumulativeWater catchup in its own useState initializer or effect if needed, 
        // but since it's a simple number, we can just add to it if we had access to setCumulativeWater.
        // Instead, we'll rely on the savedState.cumulativeWater being loaded, but we need to add the diff.
        // Since we can't easily set state here, we'll do it in a useEffect on mount.
      }

      return initialStock;
    } catch (e) {
      console.error("Erreur chargement stock", e);
      return { water: 3000, foam: 200, maxWater: 3000, maxFoam: 200, isWaterSupplied: false };
    }
  });

  // Catch-up effect for cumulativeWater
  useEffect(() => {
    if (savedState?.isTimerActive && savedState?.timeDiff && savedState.timeDiff > 0) {
       const diff = savedState.timeDiff;
       const savedFlow = savedState.flowRate || 300;
       const savedConc = savedState.concentration || 1;
       const actualFoamFlow = (savedConc / 100) * savedFlow;
       const actualWaterFlow = savedFlow - actualFoamFlow;
       setCumulativeWater(prev => prev + (actualWaterFlow * diff / 60));
    }
  }, []);

  useEffect(() => { 
    try {
      localStorage.setItem('sdis77_foam_stock_v2', JSON.stringify(stock)); 
    } catch (e) {
      console.error("Erreur sauvegarde stock", e);
    }
  }, [stock]);

  const actualFoamFlow = (concentration / 100) * flowRate;
  const actualWaterFlow = flowRate - actualFoamFlow;
  
  // Calculs sécurisés
  const autonomyFoam = actualFoamFlow > 0 ? stock.foam / actualFoamFlow : Infinity;
  const autonomyWater = stock.isWaterSupplied ? Infinity : (actualWaterFlow > 0 ? stock.water / actualWaterFlow : Infinity);
  const limitingAutonomy = Math.min(autonomyFoam, autonomyWater);
  const limitingFactor = autonomyFoam < autonomyWater ? "ADDITIF" : "EAU";
  
  // Sécurisation de la production de mousse
  let totalFoamProduced = 0;
  if (flowRate > 0 && expansionRate > 0 && elapsedSeconds > 0) {
    totalFoamProduced = (flowRate * expansionRate * (elapsedSeconds / 60)) / 1000;
  }
  
  // Helper pour l'affichage sécurisé des nombres
  const safeFixed = (num: number, digits: number) => {
    if (!isFinite(num) || isNaN(num)) return "0";
    return num.toFixed(digits);
  };

  const decantationSeconds = (targetDecantation / 25) * (emulseurType === 'biofor' ? 2 : 30) * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds(s => {
          const newS = s + 1;
          if (newS % 5 === 0) {
            setConsumptionHistory(prev => {
              const hist = [...prev, {
                time: safeFormatTime(newS),
                eau: Math.round(cumulativeWater + (actualWaterFlow / 60) * (newS - s)),
                mousse: Math.round((stock.maxFoam - stock.foam) + (actualFoamFlow / 60) * (newS - s))
              }];
              if (hist.length > 50) return hist.slice(hist.length - 50);
              return hist;
            });
          }
          return newS;
        });
        setCumulativeWater(prev => prev + (actualWaterFlow / 60));
        setStock((prev: any) => ({
          ...prev,
          water: prev.isWaterSupplied ? prev.water : Math.max(0, prev.water - (actualWaterFlow / 60)),
          foam: Math.max(0, prev.foam - (actualFoamFlow / 60))
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, actualWaterFlow, actualFoamFlow, cumulativeWater, stock.maxFoam, stock.foam]);

  useEffect(() => {
    if (isTimerActive) {
      if (limitingAutonomy <= 0) {
        setIsTimerActive(false);
        if (!stock.isWaterSupplied) {
          setShowPauseModal(true);
        }
      } else if (limitingAutonomy <= 3 && !stock.isWaterSupplied && limitingFactor === 'EAU') {
        if (!hasShown3MinWarning) {
          setNotification("Attention 3min d'autonomie si pas d'alimentation de l'engin");
          setHasShown3MinWarning(true);
          setTimeout(() => setNotification(null), 5000);
        }
      }
    }
  }, [isTimerActive, limitingAutonomy, stock.isWaterSupplied, limitingFactor, hasShown3MinWarning]);

  useEffect(() => {
    if (stock.isWaterSupplied) {
      setHasShown3MinWarning(false);
    }
  }, [stock.isWaterSupplied]);

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "∞";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(s % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${secs}` : `${m}:${secs}`;
  };

  return (
    <div className="flex flex-col flex-1 p-3 sm:p-6 space-y-4 animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto w-full">
      {mode === 'setup' ? (
        <div className="flex flex-col flex-1 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><ChevronLeft className="w-6 h-6 text-white/60" /></button>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl"><Flame className="w-6 h-6 text-white" /></div>
              <div><h1 className="text-xl sm:text-2xl font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Calcul Mousse</h1><p className="text-[9px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-widest">Opérationnel</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
              <button onClick={() => setStock({ water: 3000, foam: 200, maxWater: 3000, maxFoam: 200, isWaterSupplied: false })} className="p-3 bg-white/5 rounded-xl border border-white/10"><RefreshCcw className="w-5 h-5 text-white/60" /></button>
            </div>
          </div>

          {/* Aperçu en temps réel des performances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Autonomie Estimeé</p>
              <p className="text-xl font-mono font-black text-white">{formatTime(limitingAutonomy * 60)}</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-2xl text-center">
              <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Production Mousse</p>
              <p className="text-xl font-mono font-black text-white">{safeFixed((flowRate * expansionRate) / 1000, 1)} <span className="text-[10px]">m³/min</span></p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 hide-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-blue-400 uppercase text-[10px] font-black"><Droplets size={16}/> Eau (Hydraulique)</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStock((s: any) => ({...s, maxWater: Math.max(0, s.maxWater-100), water: Math.max(0, s.water-100)}))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-white/10"><Minus/></button>
                  <div className="flex-1 bg-black/40 rounded-xl h-12 flex items-center justify-center overflow-hidden">
                    <input 
                      type="number" 
                      min="0"
                      value={stock.maxWater || ''} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setStock((s: any) => ({...s, maxWater: val, water: val}));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-full bg-transparent text-center font-mono text-2xl font-black outline-none text-white"
                    />
                    <span className="absolute right-16 text-[10px] opacity-40 font-black">L</span>
                  </div>
                  <button onClick={() => setStock((s: any) => ({...s, maxWater: s.maxWater+100, water: s.water+100}))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-white/10"><Plus/></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setStock((s: any) => ({...s, maxWater: 3000, water: 3000}))} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${stock.maxWater === 3000 ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10'}`}>FPT (3000L)</button>
                  <button onClick={() => setStock((s: any) => ({...s, maxWater: 4000, water: 4000}))} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${stock.maxWater === 4000 ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10'}`}>CCF (4000L)</button>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <p className="text-[10px] font-black text-white/40 uppercase">Engin Alimenté ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setStock((s: any) => ({...s, isWaterSupplied: true, water: s.maxWater}))} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${stock.isWaterSupplied ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/5 border-white/10 text-white/30'}`}>OUI</button>
                    <button onClick={() => setStock((s: any) => ({...s, isWaterSupplied: false, water: s.maxWater}))} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${!stock.isWaterSupplied ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/5 border-white/10 text-white/30'}`}>NON</button>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-orange-400 uppercase text-[10px] font-black"><Database size={16}/> Additif</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStock((s: any) => ({...s, maxFoam: Math.max(0, s.maxFoam-10), foam: Math.max(0, s.foam-10)}))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-white/10"><Minus/></button>
                  <div className="flex-1 bg-black/40 rounded-xl h-12 flex items-center justify-center overflow-hidden">
                    <input 
                      type="number" 
                      min="0"
                      value={stock.maxFoam || ''} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setStock((s: any) => ({...s, maxFoam: val, foam: val}));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-full bg-transparent text-center font-mono text-2xl font-black outline-none text-white"
                    />
                    <span className="absolute right-16 text-[10px] opacity-40 font-black">L</span>
                  </div>
                  <button onClick={() => setStock((s: any) => ({...s, maxFoam: s.maxFoam+10, foam: s.foam+10}))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-white/10"><Plus/></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setStock((s: any) => ({...s, maxFoam: 200, foam: 200})); setConcentration(1); setEmulseurType('biofor'); }} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${emulseurType === 'biofor' ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/10'}`}>Bio for N (FPT)</button>
                  <button onClick={() => { setStock((s: any) => ({...s, maxFoam: 300, foam: 300})); setConcentration(3); setEmulseurType('ecopol'); }} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${emulseurType === 'ecopol' ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/10'}`}>Ecopol</button>
                </div>
                <div className="pt-2"><p className="text-[10px] font-black text-white/40 uppercase mb-2">Taux d'injection</p><div className="grid grid-cols-5 gap-1.5">{PRESET_CONCENTRATIONS.map(c => (<button key={c} onClick={() => setConcentration(c)} className={`py-3 rounded-xl border text-[10px] font-black ${concentration === c ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/10'}`}>{c}%</button>))}</div></div>
              </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white uppercase text-[10px] font-black"><Crosshair size={16}/> Débit Solution Moussante</div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setFlowRate(f => Math.max(0, f - 50))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Minus/></button>
                  <div className="flex-1 bg-black/40 rounded-xl h-12 flex items-center justify-center font-mono text-2xl font-black">{flowRate} <span className="text-sm ml-1 opacity-60">L/min</span></div>
                  <button onClick={() => setFlowRate(f => f + 50)} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Plus/></button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setFlowRate(250)} className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${flowRate === 250 ? 'bg-white text-black' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[10px] font-black uppercase">Lance (Fût)</span>
                    <span className="font-mono font-bold">250</span>
                  </button>
                  <button onClick={() => setFlowRate(300)} className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${flowRate === 300 ? 'bg-white text-black' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[10px] font-black uppercase">Ventilateur</span>
                    <span className="font-mono font-bold">300</span>
                  </button>
                  <button onClick={() => setFlowRate(1000)} className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${flowRate === 1000 ? 'bg-white text-black' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[10px] font-black uppercase">Lance Canon</span>
                    <span className="font-mono font-bold">1000</span>
                  </button>
                </div>
              </div>
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 text-orange-300 uppercase text-[10px] font-black"><Wind size={16}/> Foisonnement</div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setExpansionRate(r => Math.max(0, r - 10))} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Minus size={16}/></button>
                  <div className="flex-1 bg-black/40 rounded-xl h-10 flex items-center justify-center overflow-hidden">
                    <input 
                      type="number" 
                      min="0"
                      value={expansionRate || ''} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setExpansionRate(val);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-full bg-transparent text-center font-mono text-xl font-black outline-none text-white"
                    />
                    <span className="absolute right-12 text-[9px] opacity-40 font-black">x</span>
                  </div>
                  <button onClick={() => setExpansionRate(r => r + 10)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Plus size={16}/></button>
                </div>
                <div className="grid grid-cols-2 gap-2">{EXPANSION_RATES.map(e => (<button key={e.value} onClick={() => { setExpansionRate(e.value); if(e.label.includes('Lance')) setFlowRate(250); if(e.label.includes('Batfan') || e.label.includes('MT296')) setFlowRate(300); }} className={`py-3 rounded-xl border text-[9px] font-black uppercase ${expansionRate === e.value ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/10'}`}>{e.label}<span className="block opacity-60">x{e.value}</span></button>))}</div>
              </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-400 uppercase text-[10px] font-black">
                  <Thermometer size={16}/> Décantation Cible
                  <button onClick={() => setShowDecantInfo(true)} className="ml-auto bg-yellow-500/20 text-yellow-400 rounded-full p-1.5 hover:bg-yellow-500/40 transition-colors">
                    <Info size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setTargetDecantation(r => Math.max(5, r - 5))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Minus/></button>
                  <div className="flex-1 bg-black/40 rounded-xl h-12 flex items-center justify-center font-mono text-2xl font-black">{targetDecantation} <span className="text-sm ml-1 opacity-60">%</span></div>
                  <button onClick={() => setTargetDecantation(r => Math.min(100, r + 5))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Plus/></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setTargetDecantation(25)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${targetDecantation === 25 ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-white/5 border-white/10'}`}>25%</button>
                  <button onClick={() => setTargetDecantation(50)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${targetDecantation === 50 ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-white/5 border-white/10'}`}>50%</button>
                  <button onClick={() => setTargetDecantation(100)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${targetDecantation === 100 ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-white/5 border-white/10'}`}>100%</button>
                </div>
              </div>
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center items-center">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 text-center">Temps de renouvellement estimé</p>
                 <p className="text-4xl lg:text-5xl font-mono font-black text-yellow-400">{formatTime(decantationSeconds)}</p>
                 <p className="text-[9px] text-white/30 text-center mt-2">Basé sur {emulseurType === 'biofor' ? 'Bio For N' : 'Ecopol 3 Premium'}</p>
              </div>
            </div>
          </div>
          {isTimerActive ? (
             <button onClick={() => setMode('operational')} className="w-full bg-emerald-600 py-6 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"><CheckCircle2/> Valider & Retour</button>
          ) : (
             <button onClick={() => { 
               setMode('operational'); 
               setIsTimerActive(true); 
               if (!foamStartTime) setFoamStartTime(Date.now());
               if (stock.isWaterSupplied) setStock((s: any) => ({ ...s, water: 3000 })); 
             }} className="w-full bg-gradient-to-br from-orange-600 to-red-800 py-8 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"><Flame/> Engager l'Attaque</button>
          )}

          {showDecantInfo && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                <button onClick={()=>setShowDecantInfo(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20}/></button>
                <Info className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-black uppercase text-yellow-400 mb-2">Taux de Décantation</h3>
                <p className="text-sm text-white/80 mb-4">
                  C'est le temps nécessaire pour que la mousse perde une partie de son eau (ex: 25%).
                </p>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-left space-y-2 mb-6">
                  <p className="text-xs text-white/60"><strong className="text-orange-400">Bio For N (25%) :</strong> ~2 min</p>
                  <p className="text-xs text-white/60"><strong className="text-orange-400">Ecopol 3 (25%) :</strong> ~30 min</p>
                </div>
                <p className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest">
                  Indicateur de renouvellement du tapis
                </p>
              </div>
            </div>
          )}
        </div>
      ) : mode === 'operational' ? (
        <div className="flex flex-col flex-1 space-y-4">
          <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /><h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Intervention Active</h2></div>
            <div className="flex gap-2">
              <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
              <button onClick={() => setShowCOSModal(true)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-emerald-400"><ClipboardList size={20}/></button>
              <button onClick={() => setMode('setup')} className="p-3 bg-white/5 rounded-xl border border-white/10"><Settings size={20}/></button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-4">
            {/* Gauges Column */}
            <div className="flex flex-row lg:flex-col gap-4 justify-center bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/10 lg:w-32 shrink-0">
              <div className="flex flex-col items-center gap-3 flex-1">
                {stock.isWaterSupplied ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <Droplets size={20} className="text-emerald-400 mb-1"/>
                    <span className="text-[9px] font-black text-emerald-400 uppercase text-center leading-tight">Alim.<br/>OUI</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Droplets size={20} className="text-blue-400 mb-1"/>
                    <span className="text-[10px] font-mono font-bold text-blue-400">{Math.round(stock.water)}L</span>
                  </div>
                )}
                <div className="h-32 w-10 sm:w-12">
                  <SegmentedGauge value={stock.water} max={stock.maxWater} color={stock.isWaterSupplied ? 'green' : (stock.water/stock.maxWater < 0.2 ? 'red' : 'blue')} />
                </div>
              </div>
              <div className="w-px h-full lg:w-full lg:h-px bg-white/10"></div>
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="flex flex-col items-center">
                  <Database size={20} className="text-orange-400 mb-1"/>
                  <span className="text-[10px] font-mono font-bold text-orange-400">{Math.round(stock.foam)}L</span>
                </div>
                <div className="h-32 w-10 sm:w-12">
                  <SegmentedGauge value={stock.foam} max={stock.maxFoam} color={stock.foam/stock.maxFoam < 0.2 ? 'red' : 'orange'} />
                </div>
              </div>
            </div>

            {/* Metrics Column */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Row 1: Critical Metrics */}
              <div className="flex flex-col gap-2">
                {/* Autonomy Card - Full Width */}
                <div className={`relative overflow-hidden p-4 rounded-[2rem] border flex flex-col items-center justify-center gap-1 ${limitingAutonomy < 1 ? 'bg-red-500/10 border-red-500 animate-pulse' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="w-full text-center"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Autonomie Restante</p></div>
                  <p className={`text-5xl sm:text-6xl font-mono font-black tracking-tighter ${limitingAutonomy < 1 ? 'text-red-500' : 'text-white'}`}>
                    {formatTime(limitingAutonomy*60)}
                  </p>
                  <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${limitingAutonomy < 1 ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50'}`}>
                    {limitingAutonomy < 1 ? <AlertTriangle size={10}/> : <Activity size={10}/>}
                    Facteur Limitant : {limitingFactor}
                  </div>
                </div>

                {/* Time & Production - Side by Side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Time Card */}
                  <div className="bg-white/[0.02] p-4 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center gap-1 relative overflow-hidden aspect-square">
                     <div className="w-full text-center"><p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Durée</p></div>
                     <p className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-blue-200 tracking-tighter">{formatTime(elapsedSeconds)}</p>
                     <div className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <History size={10}/> Chrono
                     </div>
                  </div>

                  {/* Production Card */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-900/10 p-4 rounded-[2rem] border border-orange-500/20 flex flex-col items-center justify-center gap-1 relative overflow-hidden aspect-square">
                     <div className="w-full text-center"><p className="text-[9px] font-black text-orange-400/60 uppercase tracking-widest">Produit</p></div>
                     <p className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-orange-400 tracking-tighter">{safeFixed(totalFoamProduced, 0)}</p>
                     <div className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <BoxSelect size={10}/> m³
                     </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Parameters Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase text-white/30">Débit</span>
                  <span className="text-xl font-mono font-black text-white">{flowRate} <span className="text-xs text-white/40">L/min</span></span>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase text-white/30">Taux</span>
                  <span className="text-xl font-mono font-black text-orange-400">{concentration}%</span>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase text-white/30">Foisonnement</span>
                  <span className="text-xl font-mono font-black text-blue-400">x{expansionRate}</span>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase text-white/30 text-center">Décantation ({targetDecantation}%)</span>
                  <span className="text-xl font-mono font-black text-yellow-400">{formatTime(decantationSeconds)}</span>
                </div>
              </div>

              {/* Row 3: Graphique de consommation */}
              {consumptionHistory.length > 0 && (
                <div className="bg-white/[0.02] p-4 rounded-[2rem] border border-white/10 flex flex-col gap-2">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Évolution Consommation Cumulée</h3>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={consumptionHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickMargin={5} minTickGap={20} />
                        <YAxis yAxisId="left" stroke="#60a5fa" fontSize={10} tickFormatter={(val) => `${val}`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#fb923c" fontSize={10} tickFormatter={(val) => `${val}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '1rem', fontSize: '12px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                        <Line yAxisId="left" type="monotone" dataKey="eau" name="Eau (L)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="mousse" name="Émulseur (L)" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsTimerActive(!isTimerActive)} className={`flex-1 py-5 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 ${isTimerActive ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>
              {isTimerActive ? <><Pause/> PAUSE</> : <><Play/> REPRENDRE</>}
            </button>
            <button onClick={() => { setIsTimerActive(false); setMode('report'); }} className="flex-1 py-5 bg-red-600/20 border-2 border-red-500 rounded-3xl text-red-400 font-black uppercase tracking-widest flex items-center justify-center gap-2"><CheckCircle2/> Fin Opération</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 space-y-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Bilan Opération</h2></div>
            <div className="flex gap-2">
              <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
            </div>
          </div>
          <div className="flex flex-col flex-1 justify-center space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[2rem] text-center space-y-4">
            <CheckCircle2 size={60} className="text-emerald-400 mx-auto" />
            <h2 className="text-3xl font-black uppercase">Bilan Mousse</h2>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[10px] font-black text-white/40 uppercase">Eau Consommée</p><p className="text-2xl font-black">{Math.round(cumulativeWater)}L</p></div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[10px] font-black text-white/40 uppercase">Émulseur Consommé</p><p className="text-2xl font-black text-orange-400">{Math.round(stock.maxFoam - stock.foam)}L</p></div>
            </div>
            <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/40 text-center"><p className="text-[10px] font-black text-white/40 uppercase">Mousse Produit</p><p className="text-4xl font-black">{safeFixed(totalFoamProduced, 1)} m³</p></div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[10px] font-black text-white/40 uppercase">Eau Restante</p><p className="text-2xl font-black text-blue-400">{stock.isWaterSupplied ? 'Alimenté' : `${Math.round(stock.water)}L`}</p></div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[10px] font-black text-white/40 uppercase">Émulseur Restant</p><p className="text-2xl font-black text-orange-400">{Math.round(stock.foam)}L</p></div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={() => {
               const generateReport = () => {
                 let report = `BILAN OPÉRATION MOUSSE\n\n`;
                 if (foamStartTime) report += `DÉBUT PRODUCTION : ${new Date(foamStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
                 report += `DURÉE TOTALE : ${formatTime(elapsedSeconds)}\n`;
                 report += `VOLUME EAU CONSOMMÉ : ${Math.round(cumulativeWater)} L\n`;
                 report += `VOLUME ÉMULSEUR CONSOMMÉ : ${Math.round(stock.maxFoam - stock.foam)} L\n`;
                 report += `VOLUME MOUSSE PRODUIT : ${safeFixed(totalFoamProduced, 1)} m³\n\n`;
                 report += `PARAMÈTRES MOYENS :\n`;
                 report += `- Débit Solution : ${flowRate} L/min\n`;
                 report += `- Concentration : ${concentration}%\n`;
                 report += `- Foisonnement : x${expansionRate}\n\n`;
                 report += `STOCK RESTANT :\n`;
                 report += `- Eau : ${stock.isWaterSupplied ? 'Alimenté' : Math.round(stock.water) + ' L'}\n`;
                 report += `- Émulseur : ${Math.round(stock.foam)} L\n`;
                 return report;
               };
               const txt = generateReport();
               try { navigator.clipboard.writeText(txt); } catch(e){}
               const blob = new Blob([txt], { type: 'text/plain' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `RAPPORT_MOUSSE_${new Date().toLocaleDateString().replace(/\//g,'-')}.txt`;
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               URL.revokeObjectURL(url);
            }} className="flex-1 py-6 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-[2rem] font-black uppercase flex items-center justify-center gap-2"><ClipboardList/> Exporter</button>

            <button onClick={() => { 
              setMode('setup'); 
              setElapsedSeconds(0); 
              setCumulativeWater(0);
              setConsumptionHistory([]);
              setIsTimerActive(false); 
              setStock({ water: 3000, foam: 200, maxWater: 3000, maxFoam: 200, isWaterSupplied: false });
              setConcentration(1);
              setFlowRate(300);
              setExpansionRate(250);
              setFoamStartTime(null);
            }} className="flex-1 py-6 bg-white text-black rounded-[2rem] font-black uppercase flex items-center justify-center gap-2"><RotateCcw/> Nouveau</button>
          </div>
          </div>
        </div>
      )}

      {showCOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={()=>setShowCOSModal(false)} className="absolute top-6 right-6 text-white/40"><X/></button>
            <h2 className="text-xl font-black uppercase text-emerald-400 mb-6 flex items-center gap-3"><ClipboardList/> Point de Situation (COS)</h2>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30 text-center">
                  <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Heure du Point</p>
                  <p className="text-2xl font-mono font-black text-emerald-400 tracking-tighter">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/30 text-center">
                  <p className="text-[10px] font-black text-orange-400/60 uppercase tracking-widest mb-1">Début Production</p>
                  <input 
                    type="time" 
                    value={foamStartTime ? new Date(foamStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [h, m] = e.target.value.split(':').map(Number);
                      const d = new Date();
                      d.setHours(h);
                      d.setMinutes(m);
                      setFoamStartTime(d.getTime());
                    }}
                    className="bg-transparent text-xl font-mono font-black text-orange-400 tracking-tighter text-center w-full outline-none"
                  />
                </div>
              </div>

              {/* FACTEUR LIMITANT - CRITIQUE */}
              <div className={`p-5 rounded-2xl border-2 text-center ${limitingAutonomy < 5 ? 'bg-red-500/20 border-red-500 animate-pulse' : 'bg-orange-500/10 border-orange-500/50'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Facteur Limitant</p>
                <p className="text-3xl font-black uppercase mb-2">{limitingFactor}</p>
                <div className="w-full h-px bg-white/10 my-2"></div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Rupture dans</p>
                <p className="text-5xl font-mono font-black">{formatTime(limitingAutonomy * 60)}</p>
              </div>

              {/* CONSOMMATION */}
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2 tracking-widest">Consommation Actuelle</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Eau</span>
                    <span className="text-sm font-black uppercase text-white">{Math.round(actualWaterFlow)} L/min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Émulseur ({concentration}%)</span>
                    <span className="text-sm font-black uppercase text-orange-400">{safeFixed(actualFoamFlow, 1)} L/min</span>
                  </div>
                   <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Production Mousse</span>
                    <span className="text-sm font-black uppercase text-emerald-400">{safeFixed((flowRate * expansionRate) / 1000, 1)} m³/min</span>
                  </div>
                </div>
              </div>

              {/* STOCK RESTANT */}
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2 tracking-widest">Stock Restant</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Eau</p>
                      <p className="text-xl font-black">{stock.isWaterSupplied ? 'Alimenté' : `${Math.round(stock.water)} L`}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-orange-400 uppercase">Émulseur</p>
                      <p className="text-xl font-black">{Math.round(stock.foam)} L</p>
                   </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={()=>{
                const generateReport = () => {
                  let report = `POINT DE SITUATION MOUSSE (COS)\n`;
                  report += `HEURE : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
                  if (foamStartTime) report += `DÉBUT PRODUCTION : ${new Date(foamStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
                  report += `\nFACTEUR LIMITANT : ${limitingFactor}\n`;
                  report += `TEMPS AVANT RUPTURE : ${formatTime(limitingAutonomy * 60)}\n\n`;
                  report += `CONSOMMATION :\n`;
                  report += `- Eau : ${Math.round(actualWaterFlow)} L/min\n`;
                  report += `- Émulseur : ${safeFixed(actualFoamFlow, 1)} L/min\n`;
                  report += `- Production Mousse : ${safeFixed((flowRate * expansionRate) / 1000, 1)} m³/min\n\n`;
                  report += `STOCK RESTANT :\n`;
                  report += `- Eau : ${stock.isWaterSupplied ? 'Alimenté' : Math.round(stock.water) + ' L'}\n`;
                  report += `- Émulseur : ${Math.round(stock.foam)} L\n`;
                  return report;
                };
                const txt = generateReport();
                try { navigator.clipboard.writeText(txt); } catch(e){}
                setShowCOSModal(false);
              }} className="py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Copier</button>
              
              <button onClick={()=>{
                 const generateReport = () => {
                  let report = `POINT DE SITUATION MOUSSE (COS)\n`;
                  report += `HEURE : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
                  if (foamStartTime) report += `DÉBUT PRODUCTION : ${new Date(foamStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
                  report += `\nFACTEUR LIMITANT : ${limitingFactor}\n`;
                  report += `TEMPS AVANT RUPTURE : ${formatTime(limitingAutonomy * 60)}\n\n`;
                  report += `CONSOMMATION :\n`;
                  report += `- Eau : ${Math.round(actualWaterFlow)} L/min\n`;
                  report += `- Émulseur : ${safeFixed(actualFoamFlow, 1)} L/min\n`;
                  report += `- Production Mousse : ${safeFixed((flowRate * expansionRate) / 1000, 1)} m³/min\n\n`;
                  report += `STOCK RESTANT :\n`;
                  report += `- Eau : ${stock.isWaterSupplied ? 'Alimenté' : Math.round(stock.water) + ' L'}\n`;
                  report += `- Émulseur : ${Math.round(stock.foam)} L\n`;
                  return report;
                };
                const txt = generateReport();
                const blob = new Blob([txt], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SITUATION_MOUSSE_${new Date().toLocaleTimeString().replace(/:/g,'-')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setShowCOSModal(false);
              }} className="py-4 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-2xl font-black uppercase tracking-widest">Télécharger</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-orange-500 text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-orange-500/50 animate-bounce">
          {notification}
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-red-500/50 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl shadow-red-500/20 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Flame className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase text-red-500 mb-2">Opération Suspendue</h2>
              <p className="text-white/60 font-medium">Alimentation de l'engin requise pour continuer la production de mousse.</p>
            </div>
            <button 
              onClick={() => setShowPauseModal(false)} 
              className="w-full py-4 bg-red-500 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-red-400 transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODULE 2 : VENTILATION OPÉRATIONNELLE (V.O.)
// ==========================================
const VENT_MATERIAL_LABELS: Record<string, string> = {
  batfan: 'Batfan Li+', 
  mt296: 'MT296 (CO)', 
  sax: 'SAX 350', 
  stopPetit: 'Stoppeur Fumées 90cm', 
  stopGrand: 'Stoppeur Fumées 150cm',
  baliseBleue: "Balise bleue (veine d'aire)"
};

const VENT_SPECS = [
  {
    id: 'batfan',
    name: 'Leader Batfan 3 Li+',
    type: 'Ventilateur Électrique',
    icon: Zap,
    color: 'text-yellow-400',
    stats: [
      { label: 'Débit Const.', value: '18 600 m³/h' },
      { label: 'Débit Air Libre', value: '29 270 m³/h' },
      { label: 'Autonomie', value: '50 min (100%)' },
      { label: 'Poids', value: '23.5 kg' }
    ],
    features: [
      'Eclairage LED zone soufflage',
      'Inclinaison +65° à -90°',
      'Technologie Néo (jet ovalisé)',
      'Mousse HF (Fois. 250-400)',
      'VPP Cage d\'escalier : 3 à 4 étages'
    ],
    usage: 'VPP, Dépression, Mousse'
  },
  {
    id: 'sax350',
    name: 'SAX 350',
    type: 'Extracteur ATEX',
    icon: ShieldAlert,
    color: 'text-red-400',
    stats: [
      { label: 'Débit', value: '5 180 m³/h' },
      { label: 'Alim.', value: '220V (10m)' },
      { label: 'Gaine Max', value: '30 m' },
      { label: 'Zone', value: 'ATEX 1 & 2' }
    ],
    features: [
      'Extraction vapeurs dangereuses',
      'Fourni avec 2 gaines de 5m',
      'Corps acier inoxydable',
      'Protection thermique'
    ],
    usage: 'Extraction, Dépression'
  },
  {
    id: 'mt296',
    name: 'MT296',
    type: 'Ventilateur Thermique',
    icon: Flame,
    color: 'text-orange-400',
    stats: [
      { label: 'Débit', value: '128 950 m³/h' },
      { label: 'Autonomie', value: '1h50' },
      { label: 'Moteur', value: '4T 16CV' },
      { label: 'Carburant', value: 'SP 95' }
    ],
    features: [
      'Brumisation (16 L/min)',
      'Mousse HF (Fois. 800)',
      'Inclinaison réglable',
      '⚠️ GAZ D\'ÉCHAPPEMENT DANS VEINE D\'AIR',
      'Très puissant'
    ],
    usage: 'VPP, Brumisation, Mousse'
  }
];

function VentilationApp({ onBack, onHome }: { onBack: () => void, onHome: () => void }) {
  const savedState = React.useRef(loadPersistedState('sdis77_vent_state')).current;
  const [view, setView] = useState<'menu' | 'operational' | 'specs'>(savedState?.view || 'menu');
  const [step, setStep] = useState(savedState?.step || 1); 
  const [isVentilating, setIsVentilating] = useState(savedState?.isVentilating || false);
  const [elapsedSeconds, setElapsedSeconds] = useState(typeof savedState?.elapsedSeconds === 'number' ? savedState.elapsedSeconds : 0);
  const [showPMTTModal, setShowPMTTModal] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(savedState?.startTime || null);
  const [engagementARI, setEngagementARI] = useState<string | null>(savedState?.engagementARI || null); 
  const [history, setHistory] = useState<any[]>(Array.isArray(savedState?.history) ? savedState.history : []); 
  const [windDir, setWindDir] = useState<string | null>(savedState?.windDir || null); 

  const [geoData, setGeoData] = useState<{ lat: number, lon: number } | null>(null);
  const [weatherData, setWeatherData] = useState<{ windSpeed: number, windDirDegrees: number, windDirText: string } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeatherAndLocation = () => {
    setIsWeatherLoading(true);
    setWeatherError(null);
    if (!navigator.geolocation) {
      setWeatherError("Géolocalisation non supportée");
      setIsWeatherLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setGeoData({ lat, lon });
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        const speed = data.current_weather.windspeed;
        const dir = data.current_weather.winddirection;
        
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'N'];
        const textDir = dirs[Math.round((dir % 360) / 45)];
        
        setWeatherData({ windSpeed: speed, windDirDegrees: dir, windDirText: textDir });
        setWindDir(textDir); 
        setChecks(p => ({ ...p, vent: true }));
      } catch (err) {
        setWeatherError("Erreur réseau API météo");
      }
      setIsWeatherLoading(false);
    }, (err) => {
      setWeatherError("Accès position refusé");
      setIsWeatherLoading(false);
    }, { enableHighAccuracy: true });
  };

  const [checks, setChecks] = useState(savedState?.checks || { vent: false, batiment: false, stopFumee: false, lance: false, autorise: false, influenceFoyer: false });
  const [pmtt, setPmtt] = useState(savedState?.pmtt || { naturel: false, force: false, horizontale: false, verticale: false, defensive: false, vpp: false, depression: false });
  const [materials, setMaterials] = useState<Record<string, number>>(savedState?.materials || { batfan: 0, mt296: 0, sax: 0, stopPetit: 0, stopGrand: 0, baliseBleue: 0 });

  // Persistance de l'état
  useEffect(() => {
    localStorage.setItem('sdis77_vent_state', JSON.stringify({
      step, isVentilating, elapsedSeconds, startTime, engagementARI, history, windDir, checks, pmtt, materials, view, lastTimestamp: Date.now()
    }));
  }, [step, isVentilating, elapsedSeconds, startTime, engagementARI, history, windDir, checks, pmtt, materials, view]);

  const toggleCheck = (k: keyof typeof checks) => setChecks(p => ({ ...p, [k]: !p[k] }));
  const togglePMTT = (cat: string, k: keyof typeof pmtt) => setPmtt(p => {
    let n = { ...p, [k]: !p[k] };
    if (cat === 'principe') { if (k === 'naturel' && n.naturel) n.force = false; if (k === 'force' && n.force) n.naturel = false; }
    return n;
  });
  const updateMat = (k: string, d: number) => setMaterials(p => ({ ...p, [k]: Math.max(0, p[k] + d) }));

  useEffect(() => {
    let int: NodeJS.Timeout; 
    if (isVentilating) int = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(int);
  }, [isVentilating]);

  const totalSeconds = (Array.isArray(history) ? history.reduce((acc, h) => acc + ((h.durationMins || 0) * 60 + (h.durationSecs || 0)), 0) : 0) + (elapsedSeconds || 0);

  const handleSequence = () => {
    const safeElapsed = (typeof elapsedSeconds === 'number' && isFinite(elapsedSeconds)) ? elapsedSeconds : 0;
    setHistory(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, {
        phase: safePrev.length + 1,
        startTime: startTime || "N/A",
        duration: safeFormatTime(safeElapsed),
        durationMins: Math.floor(safeElapsed/60), durationSecs: safeElapsed%60,
        pmtt: { ...pmtt }, engagementARI, materials: { ...materials }
      }];
    });
    setStep(1); setElapsedSeconds(0); setStartTime(null); 
    setChecks({vent:false,batiment:false,stopFumee:false,lance:false,autorise:false,influenceFoyer:false}); 
    setPmtt({naturel:false, force:false, horizontale:false, verticale:false, defensive:false, vpp:false, depression:false});
    // On ne reset pas les matériels car ils restent engagés
    setEngagementARI(null); setWindDir(null);
  };

  const getPStr = (p: any) => p?.naturel ? 'Naturel' : p?.force ? 'Forcé' : 'N/D';
  const getMStr = (p: any) => p?.horizontale && p?.verticale ? "Mixte" : p?.horizontale ? "Horizontale" : p?.verticale ? "Verticale" : "N/D";
  const getTStr = (p: any) => p?.vpp && p?.depression ? "VPP+Dépr." : p?.vpp ? "V.P.P" : p?.depression ? "Dépr." : "N/D";

  if (view === 'menu') {
    return (
      <div className="flex flex-col flex-1 p-3 sm:p-6 space-y-4 animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center border-b border-white/5 pb-4 pt-2">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" /></button>
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20"><Wind className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
            <div><h1 className="text-xl sm:text-2xl font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Ventilation</h1><p className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Opérationnelle</p></div>
          </div>
          <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-6">
           <button onClick={() => setView('operational')} className="group relative overflow-hidden bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Wind size={120} /></div>
              <div className="relative z-10 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30"><Play className="text-black fill-current" size={24}/></div>
                <h2 className="text-2xl font-black uppercase text-white">Opérations (Live)</h2>
                <p className="text-sm text-white/60 font-medium max-w-[80%]">Suivi d'intervention, chronomètre, phases et bilan.</p>
              </div>
           </button>
           <button onClick={() => setView('specs')} className="group relative overflow-hidden bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Info size={120} /></div>
              <div className="relative z-10 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30"><FileText className="text-white" size={24}/></div>
                <h2 className="text-2xl font-black uppercase text-white">Spécificités Matériel</h2>
                <p className="text-sm text-white/60 font-medium max-w-[80%]">Fiches techniques ventilateurs (Batfan, SAX, MT296).</p>
              </div>
           </button>
        </div>
      </div>
    );
  }

  if (view === 'specs') {
    return (
      <div className="flex flex-col flex-1 bg-[#0a0f2b] text-blue-100 p-4 sm:p-6 font-sans animate-[fadeIn_0.5s_ease-out] relative overflow-hidden w-full">
        {/* Background Grid Effect */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex flex-col h-full max-w-4xl mx-auto w-full space-y-6">
          <div className="flex justify-between items-center border-b border-blue-400/20 pb-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('menu')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all shadow-lg"><ChevronLeft className="w-6 h-6 text-white" /></button>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Spécificités</h1>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Matériel Ventilation</p>
                </div>
              </div>
              <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 hide-scrollbar pb-10">
            {VENT_SPECS.map(spec => (
              <div key={spec.id} className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden relative group shadow-2xl">
                {/* Header */}
                <div className="p-6 flex items-center gap-5 border-b border-white/5 bg-white/[0.02]">
                  <div className={`w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 ${spec.color} shadow-inner`}>
                    <spec.icon size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight leading-none">{spec.name}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${spec.color} mt-2 opacity-80`}>{spec.type}</p>
                  </div>
                </div>

                {/* Warning for MT296 */}
                {spec.id === 'mt296' && (
                  <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-red-500/20 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                    <div>
                      <p className="text-xs font-black uppercase text-red-500 mb-1">Attention : Gaz d'échappement</p>
                      <p className="text-[11px] text-red-200/70 leading-relaxed font-medium">
                        Ce ventilateur thermique produit du monoxyde de carbone (CO). 
                        <strong className="text-red-400"> Les gaz sont propulsés dans la veine d'air.</strong> 
                        Usage extérieur uniquement pour soufflage.
                      </p>
                    </div>
                  </div>
                )}

                {/* Content Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Performances</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {spec.stats.map((stat, i) => (
                        <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                          <p className="text-[9px] text-white/30 uppercase font-black mb-1">{stat.label}</p>
                          <p className="text-lg font-black text-white tracking-tight">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Caractéristiques</h4>
                    </div>
                    <ul className="space-y-3">
                      {spec.features.map((feat, i) => (
                        <li key={i} className="text-[11px] text-white/70 flex items-start gap-3 font-bold leading-tight">
                          <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${spec.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4">
                      <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                          <span className="text-[9px] font-black uppercase text-blue-400/60 block mb-1">Usage Recommandé</span>
                          <span className="text-xs font-black uppercase text-blue-200 tracking-wider">{spec.usage}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-3 sm:p-6 space-y-4 animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto w-full">
      {step < 5 ? (
        <>
          <div className="flex justify-between items-center border-b border-white/5 pb-4 pt-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('menu')} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" /></button>
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20"><Wind className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
              <div><h1 className="text-xl sm:text-2xl font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Ventilation</h1><p className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{history.length > 0 ? `Phase ${history.length+1}` : "Opérationnelle"}</p></div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={onHome} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
              <button onClick={() => setShowPMTTModal(true)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-emerald-400"><ClipboardList size={22}/></button>
            </div>
          </div>

          <div className="flex w-full gap-1 mb-4 hide-scrollbar">
            {['Reco', 'Manœu', 'Action', 'Suivi'].map((l, i) => (
              <button key={i} onClick={() => setStep(i+1)} className={`flex-1 pb-3 border-b-2 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${step === i+1 ? 'border-emerald-400 text-emerald-400' : 'border-white/10 text-white/30'}`}>{i+1}. {l}</button>
            ))}
          </div>

          <div className="flex-1 pb-4">
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-3xl shadow-xl flex items-start gap-4">
                  <Eye className="w-8 h-8 text-orange-400 shrink-0" />
                  <div><h3 className="text-base font-black uppercase text-orange-400">Analyse 360°</h3><p className="text-[10px] text-white/60">Définir la veine d'air naturel et le bâtimentaire.</p></div>
                </div>
                <div className="bg-white/[0.02] backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2"><Compass size={14}/> Sens du Vent</span>
                    <button onClick={fetchWeatherAndLocation} disabled={isWeatherLoading} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[9px] px-3 py-2 rounded-xl flex items-center gap-2 font-bold uppercase transition-colors">
                      {isWeatherLoading ? <RefreshCcw size={12} className="animate-spin" /> : <MapPin size={12} />}
                      Auto (Localiser)
                    </button>
                  </div>

                  {weatherError && <p className="text-[10px] text-red-400 font-bold uppercase bg-red-500/10 px-3 py-1 rounded w-full text-center">{weatherError}</p>}
                  
                  {geoData && (
                    <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/20 relative shadow-inner">
                      <MapContainer center={[geoData.lat, geoData.lon]} zoom={17} zoomControl={false} style={{ width: '100%', height: '100%', zIndex: 10 }}>
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                        <Marker position={[geoData.lat, geoData.lon]} />
                      </MapContainer>
                      
                      {weatherData && (
                        <div className="absolute inset-0 z-[400] pointer-events-none grid grid-cols-6 grid-rows-4 items-center justify-items-center opacity-70 bg-black/10">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <ArrowUp key={i} size={24} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,1)]" style={{ transform: `rotate(${weatherData.windDirDegrees + 180}deg)` }} strokeWidth={3} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {geoData && weatherData && (
                    <div className="w-full bg-black/40 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center bg-white/5 p-3 rounded-xl">
                           <ArrowUp size={28} className="text-cyan-400 drop-shadow-md" style={{ transform: `rotate(${weatherData.windDirDegrees + 180}deg)` }} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase tracking-widest">Flux d'air</span>
                          <span className="text-[10px] font-bold text-cyan-400">Origine: {weatherData.windDirText}</span>
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-4xl font-black text-white leading-none tracking-tighter">{Math.round(weatherData.windSpeed)}</span>
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">km/h</span>
                      </div>
                    </div>
                  )}

                  <div className="relative w-40 h-40 rounded-full border border-white/10 flex items-center justify-center mt-2">
                    {['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].map((d, i) => (
                      <button key={d} onClick={() => {
                        if (windDir === d) {
                          setWindDir(null);
                          setChecks(p => ({ ...p, vent: false }));
                        } else {
                          setWindDir(d);
                          setChecks(p => ({ ...p, vent: true }));
                        }
                      }} className={`absolute font-black text-[10px] w-10 h-10 rounded-full flex items-center justify-center ${windDir === d ? 'bg-emerald-500 text-black scale-110' : 'bg-white/5 text-white/40'}`} style={{ transform: `rotate(${i * 45}deg) translate(0, -65px) rotate(-${i * 45}deg)` }}>{d}</button>
                    ))}
                    <Wind className={windDir ? 'text-emerald-400' : 'text-white/10'} />
                  </div>
                </div>
                <button onClick={() => toggleCheck('batiment')} className={`w-full p-6 rounded-3xl border flex items-center gap-4 ${checks.batiment ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10'}`}><MapIcon size={24}/><div className="text-left font-black uppercase text-sm">Structure Bâtimentaire<p className="text-[9px] opacity-60">Volumes et ouvrants reconnus</p></div></button>
                <button onClick={() => setStep(2)} className="w-full py-5 bg-white/10 rounded-2xl font-black uppercase">Suivant <ChevronRight className="inline ml-2"/></button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-red-600/20 border-2 border-red-600 p-4 rounded-3xl flex flex-col items-center text-center gap-2">
                  <ShieldAlert className="text-red-500" /><h3 className="text-lg font-black uppercase text-red-500">Tactique Offensive Interdite</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-orange-500/30 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-orange-400 border-b border-white/5 pb-1">Principe</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => togglePMTT('principe', 'naturel')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.naturel ? 'bg-orange-500 text-black' : 'bg-black/40'}`}>NATUREL</button>
                      <button onClick={() => togglePMTT('principe', 'force')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.force ? 'bg-orange-500 text-black' : 'bg-black/40'}`}>FORCÉ</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-red-500/30 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-red-500 border-b border-white/5 pb-1">Méthode</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => togglePMTT('methode', 'horizontale')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.horizontale ? 'bg-red-500 text-black' : 'bg-black/40'}`}>HORIZ.</button>
                      <button onClick={() => togglePMTT('methode', 'verticale')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.verticale ? 'bg-red-500 text-black' : 'bg-black/40'}`}>VERT.</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-teal-500/30 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-teal-400 border-b border-white/5 pb-1">Technique</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => togglePMTT('technique', 'vpp')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.vpp ? 'bg-teal-500 text-black' : 'bg-black/40'}`}>V.P.P</button>
                      <button onClick={() => togglePMTT('technique', 'depression')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.depression ? 'bg-teal-500 text-black' : 'bg-black/40'}`}>DÉPR.</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-blue-400/30 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-blue-400 border-b border-white/5 pb-1">Tactique</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => togglePMTT('tactique', 'defensive')} className={`py-3 rounded-xl border text-[10px] font-black ${pmtt.defensive ? 'bg-blue-500 text-black' : 'bg-black/40'}`}>DÉFENSIVE</button>
                      <div className="py-3 rounded-xl bg-black/40 text-[10px] font-black text-white/20 border border-white/5 line-through flex items-center justify-center">OFFENSIVE</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/10 space-y-3">
                   <h4 className="text-[9px] font-black uppercase text-white/40">Engagement Binôme</h4>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setEngagementARI('ARI')} className={`py-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black ${engagementARI === 'ARI' ? 'bg-emerald-500 text-black' : 'bg-white/5'}`}><Users size={16}/> AVEC ARI</button>
                     <button onClick={() => setEngagementARI('SANS')} className={`py-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black ${engagementARI === 'SANS' ? 'bg-orange-500 text-black' : 'bg-white/5'}`}><Users size={16}/> SANS ARI</button>
                   </div>
                </div>
                <button onClick={() => setStep(3)} className="w-full py-5 bg-white/10 rounded-2xl font-black uppercase">Suivant</button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-emerald-400 border-b border-white/10 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Settings size={14}/> Matériels utilisés</div>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full tracking-normal normal-case">Inclure matériel autres FPT</span>
                  </h4>
                  {Object.entries(VENT_MATERIAL_LABELS).map(([k,l]) => (
                    <div key={k} className={`flex items-center justify-between p-2 rounded-xl bg-white/5 border ${k==='mt296'?'border-red-500/20':'border-white/5'}`}>
                      <span className="text-[10px] sm:text-xs font-bold uppercase">{l}</span>
                      <div className="flex items-center gap-3"><button onClick={()=>updateMat(k,-1)} className="p-2 bg-white/5 rounded-lg"><Minus/></button><span className="w-4 text-center font-black">{materials[k]}</span><button onClick={()=>updateMat(k,1)} className="p-2 bg-white/5 rounded-lg"><Plus/></button></div>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/10 space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2">Checklist de sécurité</h4>
                   <button onClick={() => toggleCheck('autorise')} className={`w-full p-4 rounded-xl border flex items-center gap-3 ${checks.autorise ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10'}`}><CheckSquare size={20}/> <span className="font-black uppercase text-[10px] sm:text-xs">Autorisation COS obtenue</span></button>
                   <button onClick={() => toggleCheck('stopFumee')} className={`w-full p-4 rounded-xl border flex items-center gap-3 ${checks.stopFumee ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10'}`}><CheckSquare size={20}/> <span className="font-black uppercase text-[10px] sm:text-xs">Maîtrise des entrants & sortants</span></button>
                   <button onClick={() => toggleCheck('influenceFoyer')} className={`w-full p-4 rounded-xl border flex items-center gap-3 ${checks.influenceFoyer ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10'}`}><CheckSquare size={20}/> <span className="font-black uppercase text-[10px] sm:text-xs">Aucune influence sur le foyer</span></button>
                </div>
                <button disabled={!(checks.autorise && checks.stopFumee && checks.influenceFoyer)} onClick={() => { setIsVentilating(true); setStep(4); setStartTime(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})); }} className={`w-full py-8 rounded-3xl font-black text-xl uppercase tracking-widest ${checks.autorise && checks.stopFumee && checks.influenceFoyer ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40' : 'bg-white/5 text-white/20'}`}>Démarrer Ventilation</button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className={`bg-gradient-to-b ${isVentilating ? 'from-emerald-900/40 to-black border-emerald-500/30' : 'from-red-900/20 to-black border-red-500/30'} p-8 rounded-[2rem] border text-center space-y-2`}>
                   <Wind className={`w-12 h-12 mx-auto ${isVentilating ? 'text-emerald-400 animate-spin-slow' : 'text-red-500'}`} /><p className="text-[10px] font-black uppercase text-white/50">{isVentilating ? "Ventilation Active" : "Ventilation Stoppée"}</p><p className="text-6xl font-mono font-black">{safeFormatTime(elapsedSeconds)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {[ {i:ArrowDownToLine,c:'text-emerald-400',l:'FLUX ENTRANT'}, {i:ArrowUpFromLine,c:'text-orange-400',l:'FLUX SORTANT'}, {i:Activity,c:'text-blue-400',l:'EFFICACITÉ'}, {i:ShieldAlert,c:'text-red-400',l:'CO'} ].map((it,idx)=>(<div key={idx} className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col items-center gap-2"><it.i className={it.c}/><span className="text-[10px] font-black uppercase text-white/40">{it.l}</span></div>))}
                </div>
                <div className="space-y-3 pt-4">
                  {isVentilating ? (
                    <div className="flex flex-col gap-3">
                      <button onClick={handleSequence} className="w-full py-4 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-2xl font-black uppercase flex items-center justify-center gap-2"><History size={18}/> SÉQUENCER (Nouvelle Phase)</button>
                      <button onClick={()=>setIsVentilating(false)} className="w-full py-6 bg-red-600 border border-red-400 rounded-3xl font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"><StopCircle/> STOP & RÉÉVALUER</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                       <div className="flex gap-2"><button onClick={()=>setIsVentilating(true)} className="flex-1 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Play size={18}/> REPRENDRE</button><button onClick={handleSequence} className="flex-1 py-4 bg-blue-600 rounded-2xl font-black uppercase flex items-center justify-center gap-2"><History size={18}/> SÉQUENCER</button></div>
                       <button onClick={()=>setStep(5)} className="w-full py-5 bg-white/10 rounded-2xl font-black uppercase text-white flex items-center justify-center gap-2"><FileText/> TERMINER & BILAN</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col flex-1 space-y-4 animate-fadeIn">
           <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Bilan Opération</h2></div>
            <div className="flex gap-2">
              <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
            </div>
          </div>
           <div className="flex flex-col flex-1 justify-center space-y-6">
           <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[2rem] text-center space-y-4">
              <CheckCircle2 size={60} className="text-emerald-400 mx-auto" /><h2 className="text-3xl font-black uppercase">Bilan de l'Opération</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black text-white/40 uppercase">Durée Totale</p><p className="text-2xl font-black">{safeFormatTime(totalSeconds)}</p></div>
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black text-white/40 uppercase">Phases</p><p className="text-2xl font-black">{history.length+1}</p></div>
              </div>
              
              <div className="space-y-4 text-left">
                <h3 className="text-[10px] font-black text-white/40 uppercase border-b border-white/10 pb-2">Détail des Phases</h3>
                {/* Historique des phases précédentes */}
                {history.map((h, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs font-black text-emerald-400 uppercase">Phase {h.phase}</span>
                      <span className="text-[10px] font-mono opacity-60">{h.startTime} • {h.duration}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-white/40 block">Stratégie</span><span className="font-bold">{getPStr(h.pmtt)} / {getMStr(h.pmtt)}</span></div>
                      <div><span className="text-white/40 block">Technique</span><span className="font-bold">{getTStr(h.pmtt)}</span></div>
                      <div className="col-span-2"><span className="text-white/40 block">Matériel</span><span className="font-bold text-white/80">{Object.entries(h.materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} (x${q})`).join(', ') || 'Aucun'}</span></div>
                    </div>
                  </div>
                ))}
                
                {/* Phase finale / actuelle */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><CheckCircle2 size={40}/></div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-black text-white uppercase">Phase {history.length + 1} (Finale)</span>
                    <span className="text-[10px] font-mono opacity-60">{startTime || 'N/A'} • {safeFormatTime(elapsedSeconds)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-white/40 block">Stratégie</span><span className="font-bold">{getPStr(pmtt)} / {getMStr(pmtt)}</span></div>
                    <div><span className="text-white/40 block">Technique</span><span className="font-bold">{getTStr(pmtt)}</span></div>
                    <div className="col-span-2"><span className="text-white/40 block">Matériel</span><span className="font-bold text-white/80">{Object.entries(materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} (x${q})`).join(', ') || 'Aucun'}</span></div>
                  </div>
                </div>
              </div>
           </div>
           
           <div className="flex gap-3">
             <button onClick={() => {
                const generateReport = () => {
                  let report = `RÉCAPITULATIF VENTILATION OPÉRATIONNELLE\n\n`;
                  report += `DURÉE TOTALE : ${safeFormatTime(totalSeconds)}\n`;
                  report += `NOMBRE DE PHASES : ${history.length + 1}\n\n`;
                  
                  // Phases historiques
                  history.forEach((h) => {
                    report += `--- PHASE ${h.phase} ---\n`;
                    report += `Début : ${h.startTime}\n`;
                    report += `Durée : ${h.duration}\n`;
                    report += `Stratégie : ${getPStr(h.pmtt)} / ${getMStr(h.pmtt)} / Défensive / ${getTStr(h.pmtt)}\n`;
                    report += `Engagement : ${h.engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                    const mat = Object.entries(h.materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                    report += `Matériel : ${mat}\n\n`;
                  });
                  
                  // Phase finale
                  report += `--- PHASE ${history.length + 1} (FINALE) ---\n`;
                  report += `Début : ${startTime || 'N/A'}\n`;
                  report += `Durée : ${safeFormatTime(elapsedSeconds)}\n`;
                  report += `Stratégie : ${getPStr(pmtt)} / ${getMStr(pmtt)} / Défensive / ${getTStr(pmtt)}\n`;
                  report += `Engagement : ${engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                  const matFinal = Object.entries(materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                  report += `Matériel : ${matFinal}\n`;
                  
                  return report;
                };
                
                const txt = generateReport();
                
                // Copy to clipboard
                try { navigator.clipboard.writeText(txt); } catch(e){}
                
                // Download file
                const blob = new Blob([txt], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RAPPORT_VENTILATION_${new Date().toLocaleDateString().replace(/\//g,'-')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
             }} className="flex-1 py-6 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-[2rem] font-black uppercase flex items-center justify-center gap-2"><ClipboardList/> Exporter Rapport</button>
             
             <button onClick={() => { 
               setStep(1); 
               setIsVentilating(false);
               setElapsedSeconds(0);
               setStartTime(null);
               setEngagementARI(null);
               setHistory([]);
               setWindDir(null);
               setChecks({ vent: false, batiment: false, stopFumee: false, lance: false, autorise: false, influenceFoyer: false });
               setPmtt({ naturel: false, force: false, horizontale: false, verticale: false, defensive: false, vpp: false, depression: false });
               setMaterials({ batfan: 0, mt296: 0, sax: 0, stopPetit: 0, stopGrand: 0 });
             }} className="flex-1 py-6 bg-white text-black rounded-[2rem] font-black uppercase flex items-center justify-center gap-2"><RotateCcw/> Nouvelle Inter.</button>
           </div>
           </div>
        </div>
      )}

      {showPMTTModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={()=>setShowPMTTModal(false)} className="absolute top-6 right-6 text-white/40"><X/></button>
            <h2 className="text-xl font-black uppercase text-emerald-400 mb-6 flex items-center gap-3"><ClipboardList/> Rapport & Synthèse</h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
              
              <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30 text-center">
                <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Heure du Point</p>
                <p className="text-3xl font-mono font-black text-emerald-400 tracking-tighter">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              {startTime && (
                <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30 text-center">
                  <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Début Phase Actuelle</p>
                  <p className="text-5xl font-mono font-black text-emerald-400 tracking-tighter">{startTime}</p>
                </div>
              )}
              
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2 tracking-widest">Situation Actuelle</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Principe</span>
                    <span className="text-sm font-black uppercase text-white">{getPStr(pmtt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Méthode</span>
                    <span className="text-sm font-black uppercase text-white">{getMStr(pmtt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Technique</span>
                    <span className="text-sm font-black uppercase text-teal-400">{getTStr(pmtt)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase text-white/50 font-bold">Engagement</span>
                    <span className={`text-sm font-black uppercase px-2 py-0.5 rounded ${engagementARI==='ARI' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {engagementARI==='ARI'?'Avec ARI':'Sans ARI'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2 tracking-widest">Matériels Engagés (Total)</h3>
                <div className="space-y-2">
                  {Object.entries(materials).filter(([_, q]) => (q as number) > 0).length > 0 ? (
                    Object.entries(materials).filter(([_, q]) => (q as number) > 0).map(([k, q]) => (
                      <div key={k} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1 last:border-0">
                        <span className="text-white/50 font-bold uppercase">{VENT_MATERIAL_LABELS[k]}</span>
                        <span className="font-black text-white">x{q}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-white/20 text-[10px] italic">Aucun matériel renseigné</span>
                  )}
                </div>
              </div>

              {history.length > 0 && (
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-white/40 border-b border-white/5 pb-2 tracking-widest">Historique Phases</h3>
                  <div className="space-y-3">
                    {history.map((h, i) => (
                      <div key={i} className="text-[10px] border-b border-white/5 pb-2 last:border-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-emerald-400 font-black uppercase">Phase {h.phase}</span>
                          <span className="font-mono text-white/60">{h.startTime}</span>
                        </div>
                        <div className="text-white/40 mb-1">{getPStr(h.pmtt)} / {getMStr(h.pmtt)} / {getTStr(h.pmtt)}</div>
                        <div className="text-white/30 italic">
                          {Object.entries(h.materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={()=>{
                const generateReport = () => {
                  let report = `RÉCAPITULATIF VENTILATION OPÉRATIONNELLE\n`;
                  report += `HEURE DU POINT : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
                  
                  // Phases historiques
                  history.forEach((h) => {
                    report += `--- PHASE ${h.phase} ---\n`;
                    report += `Début : ${h.startTime}\n`;
                    report += `Durée : ${h.duration}\n`;
                    report += `Stratégie : ${getPStr(h.pmtt)} / ${getMStr(h.pmtt)} / Défensive / ${getTStr(h.pmtt)}\n`;
                    report += `Engagement : ${h.engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                    const mat = Object.entries(h.materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                    report += `Matériel : ${mat}\n\n`;
                  });
                  
                  // Phase actuelle
                  report += `--- PHASE ${history.length + 1} (ACTUELLE) ---\n`;
                  report += `Début : ${startTime || 'N/A'}\n`;
                  report += `Durée : ${safeFormatTime(elapsedSeconds)} (en cours)\n`;
                  report += `Stratégie : ${getPStr(pmtt)} / ${getMStr(pmtt)} / Défensive / ${getTStr(pmtt)}\n`;
                  report += `Engagement : ${engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                  const matFinal = Object.entries(materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                  report += `Matériel : ${matFinal}\n`;
                  
                  return report;
                };
                
                const txt = generateReport();
                try {
                  navigator.clipboard.writeText(txt);
                } catch (err) {
                  console.error("Failed to copy:", err);
                }
                setShowPMTTModal(false);
              }} className="py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Copier</button>
              
              <button onClick={()=>{
                 const generateReport = () => {
                  let report = `RÉCAPITULATIF VENTILATION OPÉRATIONNELLE\n`;
                  report += `HEURE DU POINT : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
                  
                  // Phases historiques
                  history.forEach((h) => {
                    report += `--- PHASE ${h.phase} ---\n`;
                    report += `Début : ${h.startTime}\n`;
                    report += `Durée : ${h.duration}\n`;
                    report += `Stratégie : ${getPStr(h.pmtt)} / ${getMStr(h.pmtt)} / Défensive / ${getTStr(h.pmtt)}\n`;
                    report += `Engagement : ${h.engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                    const mat = Object.entries(h.materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                    report += `Matériel : ${mat}\n\n`;
                  });
                  
                  // Phase actuelle
                  report += `--- PHASE ${history.length + 1} (ACTUELLE) ---\n`;
                  report += `Début : ${startTime || 'N/A'}\n`;
                  report += `Durée : ${safeFormatTime(elapsedSeconds)} (en cours)\n`;
                  report += `Stratégie : ${getPStr(pmtt)} / ${getMStr(pmtt)} / Défensive / ${getTStr(pmtt)}\n`;
                  report += `Engagement : ${engagementARI === 'ARI' ? 'Avec ARI' : 'Sans ARI'}\n`;
                  const matFinal = Object.entries(materials).filter(([_,q])=>(q as number)>0).map(([k,q])=>`${VENT_MATERIAL_LABELS[k]} x${q}`).join(', ') || 'Aucun';
                  report += `Matériel : ${matFinal}\n`;
                  
                  return report;
                };
                
                const txt = generateReport();
                const blob = new Blob([txt], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RAPPORT_VENTILATION_${new Date().toLocaleDateString().replace(/\//g,'-')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setShowPMTTModal(false);
              }} className="py-4 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-2xl font-black uppercase tracking-widest">Télécharger</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODULE 3 : CALCULATEUR SURFACE & MOYENS
// ==========================================
function SurfaceApp({ onBack, onHome }: { onBack: () => void, onHome: () => void }) {
  const savedState = React.useRef(loadPersistedState('sdis77_surface_state')).current;
  const [shape, setShape] = useState<'rect' | 'circle'>(savedState?.shape || 'rect');
  const [dim1, setDim1] = useState<number>(() => { const v = savedState?.dim1; return (typeof v === 'number' && isFinite(v)) ? v : 0; });
  const [dim2, setDim2] = useState<number>(() => { const v = savedState?.dim2; return (typeof v === 'number' && isFinite(v)) ? v : 0; });
  
  // SDIS 77 Logic
  const [fireType, setFireType] = useState<'hydro' | 'polar' | 'solid'>(savedState?.fireType || 'hydro');
  const [actionType, setActionType] = useState<'wetting' | 'extinction'>(savedState?.actionType || 'extinction');
  const [product, setProduct] = useState<'biofor' | 'ecopol'>(savedState?.product || 'biofor');
  const [rate, setRate] = useState<number>(() => { const v = savedState?.rate; return (typeof v === 'number' && isFinite(v)) ? v : 3; });
  const [solidConcentration, setSolidConcentration] = useState<number>(() => { const v = savedState?.solidConcentration; return (typeof v === 'number' && isFinite(v)) ? v : 0.5; });
  
  const duration = 20; // Durée fixe 20 min

  // Persistance de l'état
  useEffect(() => {
    localStorage.setItem('sdis77_surface_state', JSON.stringify({
      shape, dim1, dim2, fireType, actionType, product, rate, solidConcentration
    }));
  }, [shape, dim1, dim2, fireType, actionType, product, rate, solidConcentration]);

  // Update defaults when Fire Type or Action Type changes
  useEffect(() => {
    if (fireType === 'solid') {
      setActionType('wetting');
      setProduct('biofor');
      setRate(1.5); // Default rate for solids
    } else if (actionType === 'wetting') {
      setProduct('biofor'); // Mouillant = Bio For N uniquement
      setRate(1); // Default rate for wetting
    } else if (fireType === 'polar') {
      setProduct('ecopol'); // Polaire = Ecopol only
      setRate(5); // Default rate for polar
    } else {
      // Hydrocarbure + Extinction
      setRate(3); // Default rate for hydro
    }
  }, [fireType, actionType]);

  // Calcul Concentration
  let concentration = 1;
  if (fireType === 'solid') {
    concentration = solidConcentration;
  } else if (actionType === 'wetting') {
    concentration = 0.5; // Mouillant 0.5% par défaut
  } else {
    // Extinction
    concentration = product === 'ecopol' ? 3 : 1;
  }

  const surface = shape === 'rect' ? dim1 * dim2 : Math.PI * Math.pow(dim1 / 2, 2);
  const flowRequired = surface * rate;
  const volumeRequired = flowRequired * duration;
  const foamRequired = volumeRequired * (concentration / 100);

  // SDIS 77 Vehicles Data
  const vehicles = [
    { name: "CCRM Gallin", water: 2500, foam: { biofor: 140, ecopol: 0 } },
    { name: "FPT", water: 3000, foam: { biofor: 200, ecopol: 0 } },
    { name: "CCFM Renault", water: 3500, foam: { biofor: 60, ecopol: 0 } },
    { name: "FMOGP", water: 12000, foam: { biofor: 200, ecopol: 2000 } },
  ];

  const capableVehicles = vehicles.filter(v => {
    const foamCapacity = v.foam[product as keyof typeof v.foam] || 0;
    return v.water >= volumeRequired && foamCapacity >= foamRequired;
  });

  return (
    <div className="flex flex-col flex-1 bg-[#1a237e] text-blue-100 p-4 sm:p-6 font-mono animate-fadeIn relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="relative z-10 flex flex-col h-full max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between border-b-2 border-blue-400/30 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-blue-900/50 border border-blue-400/30 rounded hover:bg-blue-800 transition-colors"><ChevronLeft/></button>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-blue-300">Planificateur</h1>
              <p className="text-[10px] text-blue-400/60">Aide à la Décision • Surface & Moyens</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={onHome} className="p-2 bg-blue-900/50 border border-blue-400/30 rounded hover:bg-blue-800 transition-colors"><Home size={20} className="text-blue-300"/></button>
             <Ruler className="text-blue-400" size={32}/>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Géométrie */}
          <div className="bg-blue-900/40 border-2 border-blue-400/20 p-6 rounded-xl space-y-6 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase text-blue-300 flex items-center gap-2"><BoxSelect size={16}/> 1. Géométrie</h2>
            
            <div className="flex bg-blue-950/50 p-1 rounded-lg border border-blue-400/20">
              <button onClick={() => setShape('rect')} className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded transition-all ${shape === 'rect' ? 'bg-blue-500 text-white shadow-lg' : 'text-blue-400/50 hover:text-blue-300'}`}><Square size={14}/> Rectangle</button>
              <button onClick={() => setShape('circle')} className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded transition-all ${shape === 'circle' ? 'bg-blue-500 text-white shadow-lg' : 'text-blue-400/50 hover:text-blue-300'}`}><Circle size={14}/> Circulaire</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-blue-400 font-bold">{shape === 'rect' ? 'Longueur (L)' : 'Diamètre (D)'}</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={dim1 || ''} 
                    onChange={(e) => setDim1(parseFloat(e.target.value.replace(',', '.')) || 0)} 
                    onFocus={(e) => e.target.select()}
                    className="flex-1 bg-blue-950/50 border border-blue-400/30 rounded p-3 text-xl font-bold text-white focus:border-blue-400 outline-none" 
                    placeholder="0" 
                  />
                  <span className="text-blue-400 font-bold">m</span>
                </div>
              </div>
              {shape === 'rect' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] uppercase text-blue-400 font-bold">Largeur (l)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      value={dim2 || ''} 
                      onChange={(e) => setDim2(parseFloat(e.target.value.replace(',', '.')) || 0)} 
                      onFocus={(e) => e.target.select()}
                      className="flex-1 bg-blue-950/50 border border-blue-400/30 rounded p-3 text-xl font-bold text-white focus:border-blue-400 outline-none" 
                      placeholder="0" 
                    />
                    <span className="text-blue-400 font-bold">m</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-blue-400/20 space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs uppercase text-blue-300 font-bold">Surface Totale</span>
                <span className="text-4xl font-black text-white">{Math.round(surface)} <span className="text-lg text-blue-400">m²</span></span>
              </div>
            </div>
          </div>

          {/* Section 2: Tactique SDIS 77 */}
          <div className="bg-blue-900/40 border-2 border-blue-400/20 p-6 rounded-xl space-y-6 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase text-blue-300 flex items-center gap-2"><Settings size={16}/> 2. Tactique</h2>
            
            <div className="space-y-4">
              {/* Nature du Feu */}
              <div className="space-y-2 animate-fadeIn">
                <label className="text-[10px] uppercase text-blue-400 font-bold">Nature du Feu</label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFireType('hydro')} className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all ${fireType === 'hydro' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60 hover:text-blue-300'}`}>
                      Hydrocarbure
                    </button>
                    <button onClick={() => setFireType('polar')} className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all ${fireType === 'polar' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60 hover:text-blue-300'}`}>
                      Liquide Polaire
                    </button>
                  </div>
                  <button onClick={() => setFireType('solid')} className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all ${fireType === 'solid' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60 hover:text-blue-300'}`}>
                    Feu de type A (Solide)
                  </button>
                </div>
              </div>

              {/* Mode d'action */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-blue-400 font-bold">Mode d'Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setActionType('wetting')} 
                    className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all ${actionType === 'wetting' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60 hover:text-blue-300'}`}
                  >
                    Mouillant
                  </button>
                  <button 
                    disabled={fireType === 'solid'}
                    onClick={() => setActionType('extinction')} 
                    className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all ${actionType === 'extinction' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60 hover:text-blue-300'} ${fireType === 'solid' ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    Extinction (Mousse)
                  </button>
                </div>
              </div>

              {/* Additif */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-blue-400 font-bold">Additif & Concentration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setProduct('biofor')} 
                    disabled={fireType === 'polar' && actionType === 'extinction'}
                    className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all flex flex-col items-center ${product === 'biofor' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60'} ${(fireType === 'polar' && actionType === 'extinction') ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'}`}
                  >
                    <span>Bio For N</span>
                    <span className="text-xs">{fireType === 'solid' ? `${solidConcentration}%` : (actionType === 'wetting' ? '0.5%' : '1%')}</span>
                  </button>
                  <button 
                    onClick={() => setProduct('ecopol')} 
                    disabled={actionType === 'wetting' || fireType === 'solid'}
                    className={`py-2 px-2 text-[10px] font-bold uppercase rounded border transition-all flex flex-col items-center ${product === 'ecopol' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/60'} ${(actionType === 'wetting' || fireType === 'solid') ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'}`}
                  >
                    <span>Ecopol Premium</span>
                    <span className="text-xs">3%</span>
                  </button>
                </div>
                
                {/* Concentration Selector for Solid Fire */}
                {fireType === 'solid' && (
                  <div className="pt-2 animate-fadeIn space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase text-blue-400/60 font-bold">Concentration Mouillant</span>
                      <span className="text-xs font-bold text-white">{solidConcentration}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0.1, 0.3, 0.5, 0.7, 1.0].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setSolidConcentration(c)}
                          className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${solidConcentration === c ? 'bg-blue-500 border-blue-400 text-white' : 'bg-blue-950/30 border-blue-400/20 text-blue-400/40'}`}
                        >
                          {c}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Taux d'application */}
              <div className="space-y-2 pt-2 border-t border-blue-400/10">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase text-blue-400 font-bold">Taux d'application</label>
                  <span className="text-xs font-bold text-white">{rate} L/m²/min</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setRate(Math.max(1, rate - 0.5))} className="p-2 bg-blue-950/50 border border-blue-400/30 rounded-lg text-blue-300 hover:bg-blue-900 transition-colors"><Minus size={16}/></button>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="0.5" 
                    value={rate} 
                    onInput={(e) => setRate(parseFloat((e.target as HTMLInputElement).value))}
                    onChange={(e) => setRate(parseFloat(e.target.value))} 
                    className="flex-1 h-2 bg-blue-950 rounded-lg appearance-none cursor-pointer accent-blue-400" 
                  />
                  <button onClick={() => setRate(Math.min(10, rate + 0.5))} className="p-2 bg-blue-950/50 border border-blue-400/30 rounded-lg text-blue-300 hover:bg-blue-900 transition-colors"><Plus size={16}/></button>
                </div>
              </div>

              <div className="bg-blue-950/30 p-3 rounded-lg border border-blue-400/10 flex justify-between items-center">
                <span className="text-[10px] uppercase text-blue-400/60 font-bold">Durée (Réglementaire)</span>
                <span className="text-xs font-bold text-white">20 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Résultats / Moyens */}
        <div className="flex-1 bg-white/5 border-2 border-white/10 p-6 rounded-xl backdrop-blur-md flex flex-col justify-center space-y-6">
          <h2 className="text-sm font-bold uppercase text-white/60 flex items-center gap-2"><Calculator size={16}/> 3. Moyens Requis (20 min)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Débit Minimum Requis</p>
              <div className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                {Math.round(flowRequired)}
                <span className="text-lg sm:text-2xl text-blue-400 ml-2 font-bold">L/min</span>
              </div>
              <p className="text-[10px] text-blue-200/50">
                Pour {Math.round(surface)}m² • {product === 'biofor' ? 'Bio For N' : 'Ecopol'} ({concentration}%)
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-blue-300">Volume Eau Total</span>
                <span className="text-xl font-black text-white">{Math.round(volumeRequired)} L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-emerald-400">Émulseur ({concentration}%)</span>
                <span className="text-xl font-black text-emerald-400">{Math.round(foamRequired)} L</span>
              </div>
            </div>
          </div>

          {/* Suggestion Engins */}
          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
            <h3 className="text-[10px] font-black uppercase text-blue-400/60">Engins Capables (Autonomie Complète)</h3>
            {capableVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {capableVehicles.map((v, i) => (
                  <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-400"/>
                    <span className="text-xs font-bold text-emerald-100">{v.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-400"/>
                  <span className="text-xs font-bold text-red-200">Aucun engin seul ne suffit. Attaque massive ou renforts requis.</span>
                </div>
                <div className="mt-2 p-3 bg-red-900/40 rounded-xl border border-red-500/30">
                   <p className="text-[10px] font-black text-red-300 uppercase flex items-center gap-2 mb-1">
                     <ShieldAlert size={12}/> Logistique Additif
                   </p>
                   <p className="text-[11px] text-red-200/80">
                     Demander une <strong>CEMUL</strong> ou <strong>STEM</strong> pour l'acheminement de bidons supplémentaires.
                   </p>
                </div>
              </div>
            )}
          </div>

          {/* RÉFÉRENTIEL CAPACITÉS ENGINS */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-blue-300 tracking-widest flex items-center gap-2">
              <Database size={14}/> Référentiel Capacités Engins
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase">FPT</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">3000L EAU</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/40 uppercase font-bold">Bio For N</span>
                  <span className="font-black text-orange-400">200 L</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase">FMOGP</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">12000L EAU</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white/40 uppercase font-bold">Bio For N</span>
                    <span className="font-black text-orange-400">200 L</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white/40 uppercase font-bold">Ecopol</span>
                    <span className="font-black text-emerald-400">2000 L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU MOUSSE (NOUVELLE ARCHITECTURE)
// ==========================================
function FoamMenu({ onNavigate, onBack, onHome }: { onNavigate: (route: string) => void, onBack: () => void, onHome: () => void }) {
  return (
    <div className="flex flex-col flex-1 p-6 items-center justify-center animate-fadeIn relative bg-[#050505]">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4 pt-2 w-full">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
            </button>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Mousse</h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-widest">Menu Principal</p>
            </div>
          </div>
          <button onClick={onHome} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Home size={20} className="text-white/60"/></button>
        </div>

        <button onClick={() => onNavigate('foam-live')} className="w-full group relative overflow-hidden bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={120} /></div>
          <div className="relative z-10 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30"><Play className="text-black fill-current" size={24}/></div>
            <h2 className="text-2xl font-black uppercase text-white">Opérations (Live)</h2>
            <p className="text-sm text-white/60 font-medium max-w-[80%]">Suivi Intervention & Autonomie</p>
          </div>
        </button>

        <button onClick={() => onNavigate('surface')} className="w-full group relative overflow-hidden bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Calculator size={120} /></div>
          <div className="relative z-10 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30"><Calculator className="text-white" size={24}/></div>
            <h2 className="text-2xl font-black uppercase text-white">Planificateur</h2>
            <p className="text-sm text-white/60 font-medium max-w-[80%]">Surface, Moyens & Anticipation</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MENU D'ACCUEIL & ROOT
// ==========================================
export default function App() {
  const [route, setRoute] = useState('home');
  const [, setTick] = useState(0); // Force update for live widgets

  // Live clock for widgets
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Gestion de l'historique de navigation
  useEffect(() => {
    // Fonction pour gérer le retour arrière
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.route) {
        setRoute(event.state.route);
      } else {
        // Si pas d'état (ex: retour à la page initiale), on revient à home
        setRoute('home');
      }
    };

    // Écouter l'événement popstate (bouton retour / swipe)
    window.addEventListener('popstate', handlePopState);

    // Remplacer l'état initial pour qu'il ait la route 'home'
    window.history.replaceState({ route: 'home' }, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fonction de navigation personnalisée
  const navigateTo = (newRoute: string) => {
    setRoute(newRoute);
    window.history.pushState({ route: newRoute }, '');
  };

  // Use loadPersistedState for safe parsing and timestamp adjustment
  const foamState = loadPersistedState('sdis77_foam_state');
  const ventState = loadPersistedState('sdis77_vent_state');
  
  const isFoamActive = foamState?.mode === 'operational' && foamState?.isTimerActive;
  const isVentActive = ventState?.isVentilating;

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] flex flex-col transition-all duration-700 bg-[#050505] text-white">
        {route === 'home' ? (
          <div className="flex flex-col flex-1 p-6 items-center justify-center animate-fadeIn relative">
            <div className="text-center mb-10 relative">
              <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative">
                <h1 className="text-7xl sm:text-9xl font-black tracking-tighter uppercase drop-shadow-2xl">
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">OPS</span>
                  <span className="text-red-600">FLOW</span>
                </h1>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                <div className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-md">
                  <p className="font-bold tracking-[0.3em] uppercase text-[10px] text-red-400">Portail Tactique Opérationnel</p>
                </div>
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
              </div>
            </div>

            {(isFoamActive || isVentActive) && (
              <div className="w-full max-w-md mb-8 grid grid-cols-1 gap-3 animate-fadeIn">
                {isFoamActive && (
                  <button onClick={() => navigateTo('foam-live')} className="bg-orange-500/10 border border-orange-500/40 p-4 rounded-2xl flex items-center justify-between group hover:bg-orange-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 animate-pulse"><Flame size={20}/></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Mousse en cours</p>
                        <p className="text-xl font-mono font-black text-white">{safeFormatTime(foamState?.elapsedSeconds || 0)}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-orange-400/50 group-hover:translate-x-1 transition-transform"/>
                  </button>
                )}
                {isVentActive && (
                  <button onClick={() => navigateTo('ventilation')} className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between group hover:bg-emerald-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 animate-pulse"><Wind size={20}/></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Ventilation en cours</p>
                        <p className="text-xl font-mono font-black text-white">{safeFormatTime(ventState?.elapsedSeconds || 0)}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-emerald-400/50 group-hover:translate-x-1 transition-transform"/>
                  </button>
                )}
              </div>
            )}

            <div className="w-full max-w-md space-y-4">
              <button onClick={()=>navigateTo('ventilation')} className="group relative overflow-hidden bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left w-full">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Wind size={120} /></div>
                <div className="relative z-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30"><Wind className="text-black" size={24}/></div>
                  <h2 className="text-2xl font-black uppercase text-white">Ventilation</h2>
                  <p className="text-sm text-white/60 font-medium max-w-[80%]">Assistant PMTT & Séquences</p>
                </div>
              </button>

              <button onClick={()=>navigateTo('foam-menu')} className="group relative overflow-hidden bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 p-8 rounded-[2rem] transition-all duration-300 text-left w-full">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Database size={120} /></div>
                <div className="relative z-10 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30"><Database className="text-white" size={24}/></div>
                  <h2 className="text-2xl font-black uppercase text-white">Mousse</h2>
                  <p className="text-sm text-white/60 font-medium max-w-[80%]">Calculateur & Autonomie</p>
                </div>
              </button>
              
              <button 
                onClick={() => window.open('https://script.google.com/macros/s/AKfycbxKzSH9P3aT_CdSlX9Us1XImSXooX6xQJGOytwmzo5CJql3icyhSLpIvZb5MuSl-F-r1w/exec', '_blank')} 
                className="group relative overflow-hidden bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 p-3 rounded-xl transition-all duration-300 text-left w-full flex items-center gap-3"
              >
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><ClipboardList size={60} /></div>
                <div className="relative z-10 w-8 h-8 rounded-lg bg-slate-500 flex items-center justify-center shadow-lg shadow-slate-500/30 shrink-0">
                  <ClipboardList className="text-white" size={16}/>
                </div>
                <div className="relative z-10">
                  <h2 className="text-sm font-black uppercase text-white">Saisir un RETEX</h2>
                  <p className="text-[10px] text-white/60 font-medium">Retours d'Expérience</p>
                </div>
              </button>
            </div>
            <div className="mt-auto pt-10 text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">Outils numérique par <span className="text-white font-bold">Cucalon & Decarreaux</span></div>
          </div>
        ) : route === 'foam-menu' ? (
          <FoamMenu onNavigate={navigateTo} onBack={()=>window.history.back()} onHome={()=>navigateTo('home')} />
        ) : route === 'foam-live' ? (
          <FoamApp onBack={()=>window.history.back()} onHome={()=>navigateTo('home')} />
        ) : route === 'surface' ? (
          <SurfaceApp onBack={()=>window.history.back()} onHome={()=>navigateTo('home')} />
        ) : (
          <VentilationApp onBack={()=>window.history.back()} onHome={()=>navigateTo('home')} />
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
          .animate-spin-slow { animation: spin 10s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
