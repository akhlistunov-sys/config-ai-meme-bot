import React, { useState, useEffect } from 'react';
import { Token, Position, TradeRecord } from '../types';
import { formatCompact, formatCurrency } from '../utils';
import { XCircle, ExternalLink, Activity, AlertTriangle, TrendingUp, History, Wallet, DollarSign, Trophy, LineChart, Clock } from 'lucide-react';

interface LiveTerminalProps {
  scannedTokens: Token[];
  positions: Position[];
  history: TradeRecord[];
  freeCash: number;
  onPanicSell: (id: string) => void;
  isRunning: boolean;
  winRate: number;
  totalRealizedPnL: number;
  timeLimit: number;
}

const LiveTerminal: React.FC<LiveTerminalProps> = ({ scannedTokens, positions, history, freeCash, onPanicSell, isRunning, winRate, totalRealizedPnL, timeLimit }) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [now, setNow] = useState(Date.now());

  // Update timer for UI
  useEffect(() => {
     const i = setInterval(() => setNow(Date.now()), 1000);
     return () => clearInterval(i);
  }, []);

  // Calculate stats
  const totalUnrealizedPnL = positions.reduce((acc, pos) => {
    const pnlUsd = (pos.current_price - pos.entry_price) * pos.amount_tokens;
    return acc + pnlUsd;
  }, 0);
  
  const investedAmount = positions.reduce((acc, pos) => acc + (pos.entry_price * pos.amount_tokens), 0);
  const totalEquity = freeCash + investedAmount + totalUnrealizedPnL;

  const getReasonColor = (reason: string) => {
      switch(reason) {
          case 'TP': return 'text-solana-green bg-solana-green/10 border-solana-green/20';
          case 'SL': return 'text-red-500 bg-red-500/10 border-red-500/20';
          case 'TRAILING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          case 'TIME': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
          default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* HUD */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-2 shadow-inner">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Свободный Кэш</div>
           <div className="text-xl font-mono text-white mt-1">{formatCurrency(freeCash)}</div>
        </div>
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-2 shadow-inner">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Общий Капитал</div>
           <div className="text-xl font-mono text-blue-400 mt-1">{formatCurrency(totalEquity)}</div>
        </div>
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-1 shadow-inner">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
             <Trophy size={10} className="text-yellow-500" /> Winrate
           </div>
           <div className={`text-lg font-mono mt-1 ${winRate >= 50 ? 'text-solana-green' : 'text-yellow-500'}`}>
             {winRate.toFixed(0)}%
           </div>
        </div>
         <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-1 shadow-inner">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
             <TrendingUp size={10} className="text-solana-green" /> Profit
           </div>
           <div className={`text-lg font-mono mt-1 ${totalRealizedPnL >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
             {totalRealizedPnL > 0 ? '+' : ''}{totalRealizedPnL.toFixed(2)}
           </div>
        </div>
      </div>

      {/* Active Positions / History Tabs */}
      <div className="bg-solana-card rounded-lg border border-slate-700 flex-1 flex flex-col min-h-[400px]">
         <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button 
              onClick={() => setActiveTab('positions')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'positions' ? 'border-solana-green text-white bg-slate-800/30' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Activity size={16} /> Активные ({positions.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'history' ? 'border-solana-green text-white bg-slate-800/30' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <History size={16} /> История ({history.length})
            </button>
            <div className="ml-auto flex items-center px-4">
                 {isRunning && activeTab === 'positions' && <span className="text-xs text-solana-green animate-pulse font-mono">Scanning Market...</span>}
            </div>
         </div>
         
         <div className="flex-1 overflow-hidden p-2 bg-slate-950/20">
            {activeTab === 'positions' && (
              <div className="h-full overflow-auto pr-1">
                {positions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                       <Activity size={48} className="mb-2" />
                       <p className="font-bold">Нет открытых сделок</p>
                       {isRunning && <p className="text-xs mt-2 text-solana-green">Бот в поиске точки входа...</p>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {positions.map(pos => {
                            const invested = pos.entry_price * pos.amount_tokens;
                            const timeAliveMs = now - (pos.entry_time || now);
                            const timeAliveMins = timeAliveMs / 60000;
                            const timePct = Math.min((timeAliveMins / timeLimit) * 100, 100);
                            const minutes = Math.floor(timeAliveMins);
                            const seconds = Math.floor((timeAliveMs % 60000) / 1000);
                            
                            // Safe if profitable
                            const isSafe = pos.pnl_percent > 0;

                            return (
                            <div key={pos.id} className="bg-slate-900/80 rounded p-3 border border-slate-800 relative overflow-hidden group hover:border-slate-600 transition-colors shadow-lg">
                               {/* Side PnL Bar */}
                               <div className={`absolute left-0 top-0 bottom-0 w-1 ${pos.pnl_percent >= 0 ? 'bg-solana-green shadow-[0_0_10px_#14f195]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
                               
                               {/* Time Progress Bar */}
                               <div className="absolute top-0 left-1 right-0 h-1 bg-slate-800">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${isSafe ? 'bg-slate-600 opacity-30' : 'bg-gradient-to-r from-blue-500 to-red-500'}`} 
                                    style={{ width: `${timePct}%` }}
                                  ></div>
                               </div>

                               <div className="flex justify-between items-start pl-2 pt-2">
                                  <div className="flex items-center gap-3">
                                     <img src={pos.token.image_url} className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700" />
                                     <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {pos.token.ticker}
                                            <a 
                                              href={pos.token.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-slate-500 hover:text-solana-green transition-colors"
                                            >
                                              <ExternalLink size={14}/>
                                            </a>
                                        </div>
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded w-fit uppercase font-bold">
                                           Invested: <span className="font-mono text-white">${invested.toFixed(2)}</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className={`text-xl font-bold font-mono ${pos.pnl_percent >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
                                        {pos.pnl_percent > 0 ? '+' : ''}{pos.pnl_percent.toFixed(2)}%
                                     </div>
                                     <div className="text-xs text-slate-400 font-mono">
                                        ${((pos.current_price - pos.entry_price) * pos.amount_tokens).toFixed(2)}
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="mt-3 flex gap-2 pl-2 items-center">
                                   <div className="text-[10px] uppercase text-slate-500 font-bold">Price</div>
                                   <div className="text-[11px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-mono">
                                      ${pos.current_price.toFixed(8)}
                                   </div>
                                   
                                   {/* Timer Display */}
                                   <div className={`ml-2 text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded border ${isSafe ? 'text-slate-400 border-slate-700 bg-slate-800' : 'text-orange-400 border-orange-900/50 bg-orange-900/10'}`}>
                                       <Clock size={10} />
                                       {minutes}m {seconds}s / {timeLimit}m
                                   </div>

                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        onPanicSell(pos.id);
                                     }}
                                     className="ml-auto text-xs font-bold bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/40 px-4 py-2 rounded flex items-center gap-1 transition-all active:scale-95"
                                   >
                                      <XCircle size={14} /> ПРОДАТЬ
                                   </button>
                               </div>
                            </div>
                        )})}
                    </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="h-full flex flex-col">
                 {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                       <History size={48} className="mb-2" />
                       <p className="font-bold">История пуста</p>
                    </div>
                 ) : (
                    <div className="flex-1 overflow-auto bg-slate-900/40 rounded border border-slate-800 scroll-smooth">
                      <table className="w-full text-left text-xs border-collapse">
                          <thead className="text-slate-500 bg-slate-950 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="p-3 bg-slate-950 border-b border-slate-800">Токен</th>
                                <th className="p-3 bg-slate-950 border-b border-slate-800">Выход</th>
                                <th className="p-3 bg-slate-950 border-b border-slate-800 text-right">Продажа ($)</th>
                                <th className="p-3 bg-slate-950 border-b border-slate-800 text-right">PnL $</th>
                                <th className="p-3 bg-slate-950 border-b border-slate-800 text-right">Тип</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {history.map(trade => (
                                <tr key={trade.id} className="hover:bg-slate-800/40 group transition-colors">
                                  <td className="p-3 font-bold text-slate-300">
                                    <a 
                                        href={trade.token_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 hover:text-solana-green transition-colors"
                                    >
                                      {trade.token_ticker}
                                      <ExternalLink size={10} className="opacity-30 group-hover:opacity-100" />
                                    </a>
                                  </td>
                                  <td className="p-3 text-slate-400 font-mono">${trade.exit_price.toFixed(8)}</td>
                                  
                                  <td className="p-3 text-right font-mono text-slate-200 bg-slate-800/20">
                                     <span className="text-[9px] text-slate-500 mr-1 uppercase font-bold">Sold {trade.sell_percent_chunk}%:</span>
                                     ${trade.sell_value_usd.toFixed(2)}
                                  </td>

                                  <td className={`p-3 text-right font-bold ${trade.pnl_usd >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
                                      {trade.pnl_usd > 0 ? '+' : ''}{trade.pnl_usd.toFixed(2)}
                                      <div className="text-[9px] opacity-70 font-normal">{trade.pnl_percent.toFixed(1)}%</div>
                                  </td>
                                  
                                  <td className="p-3 text-right">
                                     <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getReasonColor(trade.exit_reason || 'MANUAL')}`}>
                                        {trade.exit_reason || 'MANUAL'}
                                     </span>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                      </table>
                    </div>
                 )}
              </div>
            )}
         </div>
      </div>

      {/* Discovery Feed */}
      <div className="bg-solana-card rounded-lg border border-slate-700 h-[250px] flex flex-col shadow-xl">
         <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
               <AlertTriangle size={14} className="text-yellow-500" /> Сканнер Новых Пар
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">DEXSCREENER API</span>
         </div>
         <div className="overflow-auto flex-1 text-[11px]">
            <table className="w-full text-left">
                <thead className="text-slate-500 bg-slate-900 sticky top-0 z-10">
                    <tr>
                        <th className="p-2 border-b border-slate-800">Токен</th>
                        <th className="p-2 border-b border-slate-800">Возраст</th>
                        <th className="p-2 border-b border-slate-800">Liq</th>
                        <th className="p-2 border-b border-slate-800">MCap</th>
                        <th className="p-2 border-b border-slate-800">Соцсети</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                    {scannedTokens.map((t) => (
                        <tr key={t.address} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-2">
                                <div className="flex items-center gap-2">
                                    <img src={t.image_url} className="w-5 h-5 rounded-full object-cover border border-slate-700" />
                                    <div>
                                      <span className="font-bold text-solana-purple block">{t.ticker}</span>
                                      <a href={t.url} target="_blank" className="text-[9px] text-slate-500 hover:text-solana-green flex items-center gap-1 transition-colors">
                                        DexScreener <ExternalLink size={8}/>
                                      </a>
                                    </div>
                                </div>
                            </td>
                            <td className="p-2 text-slate-300 font-mono">{t.age_minutes}m</td>
                            <td className="p-2 text-slate-300 font-mono">{formatCompact(t.liquidity)}</td>
                            <td className="p-2 text-slate-300 font-mono">{formatCompact(t.mcap)}</td>
                            <td className="p-2 flex gap-1">
                                <span className={`font-bold ${t.has_twitter ? 'text-blue-400' : 'text-slate-800'}`}>𝕏</span>
                                <span className={`font-bold ${t.has_telegram ? 'text-blue-500' : 'text-slate-800'}`}>TG</span>
                            </td>
                        </tr>
                    ))}
                    {scannedTokens.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-600 animate-pulse italic">
                                Подключение к потоку данных Solana...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default LiveTerminal;