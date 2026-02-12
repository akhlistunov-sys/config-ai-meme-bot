import React, { useState } from 'react';
import { Token, Position, TradeRecord } from '../types';
import { formatCompact, formatCurrency } from '../utils';
import { XCircle, ExternalLink, Activity, AlertTriangle, TrendingUp, History, Wallet, DollarSign, Trophy, LineChart } from 'lucide-react';

interface LiveTerminalProps {
  scannedTokens: Token[];
  positions: Position[];
  history: TradeRecord[];
  freeCash: number;
  onPanicSell: (id: string) => void;
  isRunning: boolean;
  winRate: number;
  totalRealizedPnL: number;
}

const LiveTerminal: React.FC<LiveTerminalProps> = ({ scannedTokens, positions, history, freeCash, onPanicSell, isRunning, winRate, totalRealizedPnL }) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

  // Calculate stats
  const totalUnrealizedPnL = positions.reduce((acc, pos) => {
    const pnlUsd = (pos.current_price - pos.entry_price) * pos.amount_tokens;
    return acc + pnlUsd;
  }, 0);
  
  const investedAmount = positions.reduce((acc, pos) => acc + (pos.entry_price * pos.amount_tokens), 0);
  const totalEquity = freeCash + investedAmount + totalUnrealizedPnL;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* HUD */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-2">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Свободный Кэш</div>
           <div className="text-xl font-mono text-white mt-1">{formatCurrency(freeCash)}</div>
        </div>
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-2">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Общий Капитал</div>
           <div className="text-xl font-mono text-blue-400 mt-1">{formatCurrency(totalEquity)}</div>
        </div>
        <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-1">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
             <Trophy size={10} /> Winrate
           </div>
           <div className={`text-lg font-mono mt-1 ${winRate >= 50 ? 'text-solana-green' : 'text-yellow-500'}`}>
             {winRate.toFixed(0)}%
           </div>
        </div>
         <div className="bg-solana-card p-3 rounded-lg border border-slate-700 col-span-1">
           <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
             <TrendingUp size={10} /> Profit
           </div>
           <div className={`text-lg font-mono mt-1 ${totalRealizedPnL >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
             {totalRealizedPnL > 0 ? '+' : ''}{totalRealizedPnL.toFixed(2)}
           </div>
        </div>
      </div>

      {/* Active Positions / History Tabs */}
      <div className="bg-solana-card rounded-lg border border-slate-700 flex-1 flex flex-col min-h-[300px]">
         <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button 
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'positions' ? 'border-solana-green text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <Activity size={16} /> Активные ({positions.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-solana-green text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <History size={16} /> История ({history.length})
            </button>
            <div className="ml-auto flex items-center px-4">
                 {isRunning && activeTab === 'positions' && <span className="text-xs text-solana-green animate-pulse">Live Updating...</span>}
            </div>
         </div>
         
         <div className="flex-1 overflow-hidden p-2">
            {activeTab === 'positions' && (
              <div className="h-full overflow-auto">
                {positions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                       <Activity size={48} className="mb-2" />
                       <p>Нет открытых сделок</p>
                       {isRunning && <p className="text-xs mt-2 text-solana-green">Поиск новых мемов...</p>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {positions.map(pos => {
                            const invested = pos.entry_price * pos.amount_tokens;
                            return (
                            <div key={pos.id} className="bg-slate-900 rounded p-3 border border-slate-700 relative overflow-hidden group">
                               {/* Background PnL Gradient */}
                               <div className={`absolute left-0 top-0 bottom-0 w-1 ${pos.pnl_percent >= 0 ? 'bg-solana-green' : 'bg-red-500'}`}></div>
                               
                               <div className="flex justify-between items-start pl-2">
                                  <div className="flex items-center gap-3">
                                     <img src={pos.token.image_url} className="w-10 h-10 rounded-full bg-slate-800 object-cover" />
                                     <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {pos.token.ticker}
                                            <a 
                                              href={pos.token.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-slate-500 hover:text-solana-green transition-colors"
                                              title="Открыть на DexScreener"
                                            >
                                              <ExternalLink size={14}/>
                                            </a>
                                        </div>
                                        <div className="text-xs text-slate-400 max-w-[150px] truncate">{pos.token.name}</div>
                                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded w-fit">
                                           <DollarSign size={10} className="text-solana-purple" />
                                           Buy Amount: <span className="font-mono text-white">${invested.toFixed(2)}</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className={`text-xl font-bold font-mono ${pos.pnl_percent >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
                                        {pos.pnl_percent > 0 ? '+' : ''}{pos.pnl_percent.toFixed(2)}%
                                     </div>
                                     <div className="text-xs text-slate-400">
                                        PnL: ${((pos.current_price - pos.entry_price) * pos.amount_tokens).toFixed(2)}
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="mt-3 flex gap-2 pl-2 items-center">
                                   <div className="text-[10px] uppercase text-slate-500 font-bold">Entry</div>
                                   <div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
                                      ${pos.entry_price.toFixed(8)}
                                   </div>
                                   <div className="text-[10px] uppercase text-slate-500 font-bold ml-2">Curr</div>
                                   <div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
                                      ${pos.current_price.toFixed(8)}
                                   </div>
                                   
                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        onPanicSell(pos.id);
                                     }}
                                     className="ml-auto text-xs font-bold bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 px-4 py-2 rounded flex items-center gap-1 transition-all"
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
                       <p>История пуста</p>
                    </div>
                 ) : (
                    <div className="flex-1 overflow-auto bg-slate-900 rounded border border-slate-800">
                      <table className="w-full text-left text-xs relative">
                          <thead className="text-slate-500 bg-slate-950 sticky top-0 z-10 shadow-lg">
                            <tr>
                                <th className="p-3 bg-slate-950">Токен</th>
                                <th className="p-3 bg-slate-950">Цена Входа</th>
                                <th className="p-3 bg-slate-950">Цена Выхода</th>
                                <th className="p-3 bg-slate-950 text-right">Продажа ($)</th>
                                <th className="p-3 bg-slate-950 text-right">PnL $</th>
                                <th className="p-3 bg-slate-950 text-right">PnL %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {history.map(trade => (
                                <tr key={trade.id} className="hover:bg-slate-800/50 group transition-colors">
                                  <td className="p-3 font-bold text-slate-300">
                                    <a 
                                        href={trade.token_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 hover:text-solana-green transition-colors"
                                    >
                                      {trade.token_ticker}
                                      <ExternalLink size={10} className="opacity-50" />
                                    </a>
                                  </td>
                                  <td className="p-3 text-slate-400 font-mono border-r border-slate-800/50">${trade.entry_price.toFixed(8)}</td>
                                  <td className="p-3 text-slate-400 font-mono border-r border-slate-800/50">${trade.exit_price.toFixed(8)}</td>
                                  
                                  <td className="p-3 text-right font-mono text-slate-300 border-r border-slate-800/50">
                                     <span className="text-[10px] text-slate-500 mr-1">({trade.sell_percent_chunk}%)</span>
                                     ${trade.sell_value_usd.toFixed(2)}
                                  </td>

                                  <td className={`p-3 text-right font-bold border-r border-slate-800/50 ${trade.pnl_usd >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
                                      {trade.pnl_usd > 0 ? '+' : ''}{trade.pnl_usd.toFixed(2)}
                                  </td>
                                  <td className={`p-3 text-right font-bold ${trade.pnl_percent >= 0 ? 'text-solana-green' : 'text-red-500'}`}>
                                      {trade.pnl_percent > 0 ? '+' : ''}{trade.pnl_percent.toFixed(1)}%
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
      <div className="bg-solana-card rounded-lg border border-slate-700 h-[300px] flex flex-col">
         <div className="p-3 border-b border-slate-700 bg-slate-900/50">
            <h3 className="text-white font-bold flex items-center gap-2">
               <AlertTriangle size={16} className="text-yellow-500" /> Сканнер (Solana Real-time)
            </h3>
         </div>
         <div className="overflow-auto flex-1 text-xs">
            <table className="w-full text-left">
                <thead className="text-slate-500 bg-slate-900 sticky top-0">
                    <tr>
                        <th className="p-2">Токен</th>
                        <th className="p-2">Возраст</th>
                        <th className="p-2">Liq</th>
                        <th className="p-2">MCap</th>
                        <th className="p-2">Инфо</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {scannedTokens.map((t) => (
                        <tr key={t.address} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-2">
                                <div className="flex items-center gap-2">
                                    <img src={t.image_url} className="w-5 h-5 rounded-full object-cover" />
                                    <div>
                                      <span className="font-bold text-solana-purple block">{t.ticker}</span>
                                      <a href={t.url} target="_blank" className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1">
                                        DS <ExternalLink size={8}/>
                                      </a>
                                    </div>
                                </div>
                            </td>
                            <td className="p-2 text-slate-300">{t.age_minutes} мин</td>
                            <td className="p-2 text-slate-300">{formatCompact(t.liquidity)}</td>
                            <td className="p-2 text-slate-300">{formatCompact(t.mcap)}</td>
                            <td className="p-2 flex gap-1">
                                <span className={t.has_twitter ? 'text-blue-400' : 'text-slate-700'}>𝕏</span>
                                <span className={t.has_telegram ? 'text-blue-400' : 'text-slate-700'}>TG</span>
                            </td>
                        </tr>
                    ))}
                    {scannedTokens.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-500">
                                Подключение к DexScreener...
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