import React, { useState, useEffect, useRef } from 'react';
import { Strategy, Token, Position, TradeRecord } from './types';
import StrategyForm from './components/StrategyForm';
import LiveTerminal from './components/LiveTerminal';
import { fetchSolanaPairs, fetchPairPrice } from './utils';
import { Play, Pause, RotateCcw, Save, Zap, Trash2 } from 'lucide-react';

// Storage Keys
const STORAGE_KEYS = {
  STRATEGY: 'meme_bot_strategy',
  CASH: 'meme_bot_cash',
  POSITIONS: 'meme_bot_positions',
  HISTORY: 'meme_bot_history'
};

const INITIAL_STRATEGY: Strategy = {
  strategy_name: "SolanaUltraEarlyMemeScalp",
  time_window_minutes: [2, 60],
  chain: "Solana",
  discovery_sources: ["DexScreener_NewPairs"],
  filters: {
    liquidity_usd: { min: 1000, max: 500000 }, 
    market_cap_usd: { min: 5000, max: 5000000 },
    token_age_minutes: { min: 0, max: 2880 }, 
    volume_first_10m_usd: { min: 5000 },
    lp_locked_required: false,
    mint_authority: "revoked",
    freeze_authority: "revoked",
    max_single_wallet_percent: 25,
    max_dev_wallet_percent: 20
  },
  entry: {
    type: "first_pullback",
    min_pump_percent: 30,
    max_pump_percent: 150,
    pullback_percent: [20, 40],
    confirm_new_volume: true
  },
  position_sizing: {
    mode: "percent_equity",
    bet_percent: 2, 
    max_open_positions: 5
  },
  stop_loss: {
    type: "soft",
    hard_stop_percent: 10,
    time_stop_minutes: 5
  },
  take_profit: {
    scale_out: [
      { profit_percent: 30, sell_percent: 50 },
      { profit_percent: 60, sell_percent: 50 }
    ],
    moonbag_trailing_stop_percent: 30
  },
  exit_conditions: {
    no_new_buys_seconds: 120,
    large_wallet_dump: true,
    lp_moved: true,
    volume_collapse: true
  },
  social_filters: {
    require_twitter: false,
    require_telegram: false,
    require_image: true,
    keywords: ""
  },
  risk_profile: "ultra_high"
};

const App: React.FC = () => {
  // --- STATE INIT WITH LOCAL STORAGE ---
  const [strategy, setStrategy] = useState<Strategy>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STRATEGY);
    return saved ? JSON.parse(saved) : INITIAL_STRATEGY;
  });

  const [freeCash, setFreeCash] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH);
    return saved ? parseFloat(saved) : 100.00;
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSITIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<TradeRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isRunning, setIsRunning] = useState(false);
  const [scannedTokens, setScannedTokens] = useState<Token[]>([]);
  
  const scannerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stats Calculation
  const totalRealizedPnL = history.reduce((acc, h) => acc + h.pnl_usd, 0);
  const winningTrades = history.filter(h => h.pnl_usd > 0).length;
  const totalTrades = history.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.STRATEGY, JSON.stringify(strategy)); }, [strategy]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CASH, freeCash.toString()); }, [freeCash]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)); }, [history]);

  // --- SCANNER LOGIC ---
  useEffect(() => {
    const runScanner = async () => {
      const newTokens = await fetchSolanaPairs();
      
      setScannedTokens(newTokens);

      if (isRunning) {
         const candidates = newTokens.filter(t => {
            if (t.liquidity < strategy.filters.liquidity_usd.min || t.liquidity > strategy.filters.liquidity_usd.max) return false;
            if (t.mcap < strategy.filters.market_cap_usd.min || t.mcap > strategy.filters.market_cap_usd.max) return false;
            if (t.age_minutes < strategy.filters.token_age_minutes.min || t.age_minutes > strategy.filters.token_age_minutes.max) return false;
            if (strategy.social_filters.require_image && t.image_url.includes('placeholder')) return false;
            if (strategy.social_filters.require_twitter && !t.has_twitter) return false;
            if (strategy.social_filters.require_telegram && !t.has_telegram) return false;
            return true;
         });

         for (const token of candidates) {
             // 1. Check if we already have this position
             if (positions.find(p => p.token.address === token.address)) continue;
             
             // 2. Check History to prevent re-entry
             const alreadyTraded = history.some(h => h.token_url === token.url || h.token_ticker === token.ticker);
             if (alreadyTraded) continue;

             // 3. Max positions check
             if (positions.length >= strategy.position_sizing.max_open_positions) break;
             
             // 4. Calculate Equity and Bet Size (Percentage based)
             const currentEquity = freeCash + positions.reduce((acc, p) => acc + (p.current_price * p.amount_tokens), 0);
             const betAmountUsd = currentEquity * (strategy.position_sizing.bet_percent / 100);

             // 5. Budget check (Min $1 trade)
             if (freeCash < betAmountUsd || betAmountUsd < 1.0) break;

             openPosition(token, betAmountUsd);
             break; 
         }
      }
    };

    if (isRunning) {
      runScanner(); 
      scannerInterval.current = setInterval(runScanner, 8000); 
    } else {
      if (scannerInterval.current) clearInterval(scannerInterval.current);
    }
    return () => { if (scannerInterval.current) clearInterval(scannerInterval.current); };
  }, [isRunning, positions, freeCash, strategy, history]);

  // --- MARKET LOGIC ---
  useEffect(() => {
    if (isRunning && positions.length > 0) {
      marketInterval.current = setInterval(async () => {
        const updates = await Promise.all(positions.map(async (pos) => {
           const realPrice = await fetchPairPrice(pos.token.address);
           const newPrice = realPrice || pos.current_price;
           const pnlPct = ((newPrice - pos.entry_price) / pos.entry_price) * 100;

           let newPos = { ...pos, current_price: newPrice, pnl_percent: pnlPct };
           let soldAmount = 0;
           let soldValue = 0;
           let realisedPnL = 0;

           // TP Logic
           strategy.take_profit.scale_out.forEach(step => {
             const stepId = `${step.profit_percent}`;
             if (pnlPct >= step.profit_percent && !newPos.history.includes(`TP_${stepId}`)) {
                const fraction = step.sell_percent / 100;
                const tokensToSell = pos.amount_tokens * fraction; 
                const tokensToSellActual = newPos.amount_tokens * fraction;
                
                const tradeValue = tokensToSellActual * newPrice;
                const tradeCost = tokensToSellActual * pos.entry_price;
                const tradePnL = tradeValue - tradeCost;

                soldAmount += tokensToSellActual;
                soldValue += tradeValue;
                realisedPnL += tradePnL;

                newPos.amount_tokens -= tokensToSellActual;
                newPos.history.push(`TP_${stepId}`);
                
                // Add TP history
                addHistory(newPos.token, pos.entry_price, newPrice, tradeValue, step.sell_percent, realisedPnL, pnlPct);
             }
           });

           if (soldValue > 0) {
             setFreeCash(c => c + soldValue);
           }

           // SL Logic
           if (pnlPct <= -strategy.stop_loss.hard_stop_percent) {
              const remainingValue = newPos.amount_tokens * newPrice;
              const remainingCost = newPos.amount_tokens * pos.entry_price;
              const lossPnL = remainingValue - remainingCost;

              setFreeCash(c => c + remainingValue);
              addHistory(newPos.token, pos.entry_price, newPrice, remainingValue, 100, lossPnL, pnlPct);
              newPos.status = 'CLOSED';
              newPos.amount_tokens = 0;
           }

           return newPos;
        }));

        setPositions(updates.filter(p => p.status === 'OPEN' && p.amount_tokens > 0));

      }, 3000); 
    } else {
      if (marketInterval.current) clearInterval(marketInterval.current);
    }
    return () => { if (marketInterval.current) clearInterval(marketInterval.current); };
  }, [isRunning, positions, strategy]);


  const openPosition = (token: Token, usdAmount: number) => {
    const entryPrice = token.price_usd;
    if (entryPrice <= 0) return;

    const amountTokens = usdAmount / entryPrice;
    
    const newPosition: Position = {
      id: Math.random().toString(36).substr(2, 9),
      token,
      entry_price: entryPrice,
      current_price: entryPrice,
      amount_tokens: amountTokens,
      entry_time: Date.now(),
      pnl_percent: 0,
      status: 'OPEN',
      history: []
    };

    setFreeCash(prev => prev - usdAmount);
    setPositions(prev => [...prev, newPosition]);
  };

  const addHistory = (
      token: Token, 
      entry: number, 
      exit: number, 
      sellValue: number,
      sellPercent: number,
      pnlUsd: number, 
      pnlPct: number
  ) => {
     const record: TradeRecord = {
       id: Math.random().toString(36),
       token_ticker: token.ticker,
       token_url: token.url, 
       entry_price: entry,
       exit_price: exit,
       sell_value_usd: sellValue,
       sell_percent_chunk: sellPercent,
       pnl_usd: pnlUsd,
       pnl_percent: pnlPct,
       closed_at: Date.now()
     };
     setHistory(prev => [record, ...prev]);
  };

  const handlePanicSell = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (pos) {
      const cashValue = pos.amount_tokens * pos.current_price;
      const costBasis = pos.amount_tokens * pos.entry_price;
      const pnlUsd = cashValue - costBasis;
      
      setFreeCash(b => b + cashValue);
      addHistory(pos.token, pos.entry_price, pos.current_price, cashValue, 100, pnlUsd, pos.pnl_percent);
      setPositions(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleReset = () => {
    if (window.confirm("ПОЛНЫЙ СБРОС: Баланс вернется к $100, история очистится, настройки стратегии будут сброшены. Продолжить?")) {
      setFreeCash(100);
      setPositions([]);
      setHistory([]);
      setScannedTokens([]);
      setStrategy(INITIAL_STRATEGY); // Full strategy reset
      setIsRunning(false);
      localStorage.clear(); 
    }
  };

  return (
    <div className="min-h-screen bg-solana-dark text-slate-200 font-sans selection:bg-solana-green selection:text-black">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-solana-green to-solana-purple rounded flex items-center justify-center font-bold text-black">
               <Zap size={20} fill="currentColor" />
             </div>
             <h1 className="font-bold text-xl tracking-tight text-white">
               Meme<span className="text-solana-green">Sniper</span> <span className="text-xs bg-slate-800 px-1 rounded text-slate-400">PRO</span>
             </h1>
           </div>

           <div className="flex items-center gap-4">
              <div className="hidden md:block text-xs text-slate-500 text-right">
                <div>Phantom Wallet</div>
                <div className="text-solana-purple font-mono">2xHq...9jLp</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-6">
        
        {/* Left Col: Strategy Config */}
        <div className="lg:col-span-5 space-y-6">
           <div className="flex items-center justify-between">
             <h2 className="text-lg font-semibold text-white">Конфигурация Бота</h2>
           </div>
           
           <StrategyForm strategy={strategy} setStrategy={setStrategy} />
        </div>

        {/* Right Col: Live Monitoring */}
        <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Control Bar */}
            <div className="bg-solana-card p-4 rounded-xl border border-slate-700 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsRunning(!isRunning)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-black transition-all transform active:scale-95 ${isRunning ? 'bg-red-500 hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-solana-green hover:bg-[#3bf5a7] shadow-[0_0_20px_rgba(20,241,149,0.4)]'}`}
                    >
                      {isRunning ? <><Pause size={20} fill="currentColor" /> СТОП</> : <><Play size={20} fill="currentColor" /> ЗАПУСК</>}
                    </button>

                    {!isRunning && (
                      <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600"
                      >
                         <Trash2 size={16} /> СБРОС СЧЕТА
                      </button>
                    )}
                    
                    <div className="flex flex-col ml-2">
                      <span className="text-xs text-slate-400">Статус</span>
                      <span className={`text-sm font-bold flex items-center gap-2 ${isRunning ? 'text-solana-green' : 'text-slate-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-solana-green animate-pulse' : 'bg-slate-600'}`}></div>
                        {isRunning ? 'РАБОТАЕТ' : 'ОЖИДАНИЕ'}
                      </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-l border-slate-700 pl-4">
                   <div className="text-right">
                      <div className="text-xs text-slate-400">Режим: Симуляция Счета</div>
                      <div className="text-white font-mono font-bold">100.00 USD (Real Data)</div>
                   </div>
                </div>
            </div>

            {/* Terminal */}
            <div className="flex-1 min-h-[600px]">
               <LiveTerminal 
                 scannedTokens={scannedTokens} 
                 positions={positions} 
                 history={history}
                 freeCash={freeCash}
                 onPanicSell={handlePanicSell}
                 isRunning={isRunning}
                 winRate={winRate}
                 totalRealizedPnL={totalRealizedPnL}
               />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;