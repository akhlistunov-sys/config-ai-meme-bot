import React, { useRef } from 'react';
import { Strategy, TakeProfitStep } from '../types';
import { Settings, Shield, Target, Activity, DollarSign, ListFilter, Trash2, Plus, Download, Upload } from 'lucide-react';

interface StrategyFormProps {
  strategy: Strategy;
  setStrategy: React.Dispatch<React.SetStateAction<Strategy>>;
}

const StrategyForm: React.FC<StrategyFormProps> = ({ strategy, setStrategy }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateNested = (path: string[], value: any) => {
    setStrategy(prev => {
      const newStrategy = { ...prev };
      let current: any = newStrategy;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newStrategy;
    });
  };

  const addTakeProfitStep = () => {
    setStrategy(prev => ({
      ...prev,
      take_profit: {
        ...prev.take_profit,
        scale_out: [...prev.take_profit.scale_out, { profit_percent: 0, sell_percent: 0 }]
      }
    }));
  };

  const removeTakeProfitStep = (index: number) => {
    setStrategy(prev => ({
      ...prev,
      take_profit: {
        ...prev.take_profit,
        scale_out: prev.take_profit.scale_out.filter((_, i) => i !== index)
      }
    }));
  };

  const updateTakeProfitStep = (index: number, field: keyof TakeProfitStep, value: number) => {
    setStrategy(prev => {
      const newScaleOut = [...prev.take_profit.scale_out];
      newScaleOut[index] = { ...newScaleOut[index], [field]: value };
      return {
        ...prev,
        take_profit: { ...prev.take_profit, scale_out: newScaleOut }
      };
    });
  };

  // --- JSON IMPORT / EXPORT HANDLERS ---
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strategy, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${strategy.strategy_name || "strategy"}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        // Basic validation could go here
        setStrategy(json);
        alert("Стратегия успешно загружена!");
      } catch (error) {
        alert("Ошибка при чтении файла конфигурации.");
        console.error(error);
      }
    };
    reader.readAsText(fileObj);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <div className="space-y-6 text-sm">
      
      {/* Configuration Header / Controls */}
      <div className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
         <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors"
            >
              <Download size={14} /> Скачать JSON
            </button>
            <button 
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors"
            >
              <Upload size={14} /> Загрузить JSON
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{display: 'none'}} 
              accept=".json"
            />
         </div>
      </div>

      {/* Filters Section */}
      <div className="bg-solana-card p-4 rounded-lg border border-slate-700">
        <h3 className="text-solana-green font-bold flex items-center gap-2 mb-4">
          <ListFilter size={18} /> Фильтры Поиска
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 block mb-1">Ликвидность ($)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.liquidity_usd.min}
                onChange={(e) => updateNested(['filters', 'liquidity_usd', 'min'], Number(e.target.value))}
              />
              <span className="text-slate-500 pt-1">-</span>
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.liquidity_usd.max}
                onChange={(e) => updateNested(['filters', 'liquidity_usd', 'max'], Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Капитализация ($)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.market_cap_usd.min}
                onChange={(e) => updateNested(['filters', 'market_cap_usd', 'min'], Number(e.target.value))}
              />
              <span className="text-slate-500 pt-1">-</span>
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.market_cap_usd.max}
                onChange={(e) => updateNested(['filters', 'market_cap_usd', 'max'], Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Возраст токена (мин)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.token_age_minutes.min}
                onChange={(e) => updateNested(['filters', 'token_age_minutes', 'min'], Number(e.target.value))}
              />
              <span className="text-slate-500 pt-1">-</span>
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                value={strategy.filters.token_age_minutes.max}
                onChange={(e) => updateNested(['filters', 'token_age_minutes', 'max'], Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Макс % у холдера</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              value={strategy.filters.max_single_wallet_percent}
              onChange={(e) => updateNested(['filters', 'max_single_wallet_percent'], Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2 mt-2">
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={strategy.filters.mint_authority === 'revoked'}
                  onChange={(e) => updateNested(['filters', 'mint_authority'], e.target.checked ? 'revoked' : 'allowed')}
                  className="rounded border-slate-700 bg-slate-900 text-solana-green focus:ring-solana-green"
                />
                <span>Mint отключен (Revoked)</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={strategy.filters.freeze_authority === 'revoked'}
                  onChange={(e) => updateNested(['filters', 'freeze_authority'], e.target.checked ? 'revoked' : 'allowed')}
                  className="rounded border-slate-700 bg-slate-900 text-solana-green focus:ring-solana-green"
                />
                <span>Freeze отключен (Revoked)</span>
             </label>
          </div>
        </div>
      </div>

      {/* Socials Section */}
      <div className="bg-solana-card p-4 rounded-lg border border-slate-700">
        <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-4">
          <Activity size={18} /> Соцсети и Мета
        </h3>
        <div className="space-y-3">
          <div className="flex gap-6">
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={strategy.social_filters.require_twitter}
                  onChange={(e) => updateNested(['social_filters', 'require_twitter'], e.target.checked)}
                />
                <span>Twitter (X)</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={strategy.social_filters.require_telegram}
                  onChange={(e) => updateNested(['social_filters', 'require_telegram'], e.target.checked)}
                />
                <span>Telegram</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={strategy.social_filters.require_image}
                  onChange={(e) => updateNested(['social_filters', 'require_image'], e.target.checked)}
                />
                <span>Есть картинка</span>
             </label>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Ключевые слова (через запятую)</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              placeholder="пример: AI, Dog, Cat, Pepe"
              value={strategy.social_filters.keywords}
              onChange={(e) => updateNested(['social_filters', 'keywords'], e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Risk Section */}
      <div className="bg-solana-card p-4 rounded-lg border border-slate-700">
        <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4">
          <Shield size={18} /> Риск-менеджмент
        </h3>
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="text-slate-400 block mb-1">Ставка на сделку (% от депо)</label>
            <div className="relative">
              <span className="absolute left-2 top-1 text-slate-500">%</span>
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded pl-6 py-1 text-white"
                value={strategy.position_sizing.bet_percent}
                onChange={(e) => updateNested(['position_sizing', 'bet_percent'], Number(e.target.value))}
              />
            </div>
           </div>
           <div>
            <label className="text-slate-400 block mb-1">Макс. позиций</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              value={strategy.position_sizing.max_open_positions}
              onChange={(e) => updateNested(['position_sizing', 'max_open_positions'], Number(e.target.value))}
            />
           </div>
           <div>
            <label className="text-slate-400 block mb-1">Hard Stop Loss (%)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              value={strategy.stop_loss.hard_stop_percent}
              onChange={(e) => updateNested(['stop_loss', 'hard_stop_percent'], Number(e.target.value))}
            />
           </div>
           <div>
            <label className="text-slate-400 block mb-1">Стоп по времени (мин)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              value={strategy.stop_loss.time_stop_minutes}
              onChange={(e) => updateNested(['stop_loss', 'time_stop_minutes'], Number(e.target.value))}
            />
           </div>
        </div>
      </div>

      {/* Take Profit Section */}
      <div className="bg-solana-card p-4 rounded-lg border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-solana-green font-bold flex items-center gap-2">
            <Target size={18} /> Стратегия Take Profit
          </h3>
          <button 
            onClick={addTakeProfitStep}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <Plus size={12} /> Добавить
          </button>
        </div>

        <div className="space-y-2">
          {strategy.take_profit.scale_out.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-end">
               <div className="flex-1">
                 <label className="text-xs text-slate-500 block">Профит %</label>
                 <input 
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-solana-green"
                    value={step.profit_percent}
                    onChange={(e) => updateTakeProfitStep(idx, 'profit_percent', Number(e.target.value))}
                  />
               </div>
               <div className="flex-1">
                 <label className="text-xs text-slate-500 block">Продать %</label>
                 <input 
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-red-400"
                    value={step.sell_percent}
                    onChange={(e) => updateTakeProfitStep(idx, 'sell_percent', Number(e.target.value))}
                  />
               </div>
               <button 
                 onClick={() => removeTakeProfitStep(idx)}
                 className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded"
               >
                 <Trash2 size={14} />
               </button>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <label className="text-slate-400 block mb-1">Trailing Stop (%) для остатка</label>
          <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              value={strategy.take_profit.moonbag_trailing_stop_percent}
              onChange={(e) => updateNested(['take_profit', 'moonbag_trailing_stop_percent'], Number(e.target.value))}
            />
        </div>
      </div>
    </div>
  );
};

export default StrategyForm;