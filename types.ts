export interface Range {
  min: number;
  max: number;
}

export interface TakeProfitStep {
  profit_percent: number;
  sell_percent: number;
}

export interface Strategy {
  strategy_name: string;
  time_window_minutes: [number, number];
  chain: string;
  discovery_sources: string[];
  filters: {
    liquidity_usd: Range;
    market_cap_usd: Range;
    token_age_minutes: Range;
    volume_first_10m_usd: { min: number };
    lp_locked_required: boolean;
    mint_authority: 'revoked' | 'allowed';
    freeze_authority: 'revoked' | 'allowed';
    max_single_wallet_percent: number;
    max_dev_wallet_percent: number;
  };
  entry: {
    type: string;
    min_pump_percent: number;
    max_pump_percent: number;
    pullback_percent: [number, number];
    confirm_new_volume: boolean;
  };
  position_sizing: {
    mode: string;
    bet_percent: number; // Changed from usd_per_trade
    max_open_positions: number;
  };
  stop_loss: {
    type: string;
    hard_stop_percent: number;
    time_stop_minutes: number;
  };
  take_profit: {
    scale_out: TakeProfitStep[];
    moonbag_trailing_stop_percent: number;
  };
  exit_conditions: {
    no_new_buys_seconds: number;
    large_wallet_dump: boolean;
    lp_moved: boolean;
    volume_collapse: boolean;
  };
  social_filters: {
    require_twitter: boolean;
    require_telegram: boolean;
    require_image: boolean;
    keywords: string;
  };
  risk_profile: string;
}

export interface Token {
  address: string; // Pair address for DexScreener
  tokenAddress: string; // The actual token mint address
  ticker: string;
  name: string;
  liquidity: number;
  mcap: number;
  age_minutes: number;
  has_twitter: boolean;
  has_telegram: boolean;
  image_url: string;
  price_change_5m: number;
  price_usd: number;
  top_holder_pct: number; // Simulated in frontend prototype
  mint_auth_revoked: boolean; // Simulated in frontend prototype
  freeze_auth_revoked: boolean; // Simulated in frontend prototype
  url: string; // DexScreener URL
}

export interface Position {
  id: string;
  token: Token;
  entry_price: number;
  current_price: number;
  amount_tokens: number;
  entry_time: number;
  pnl_percent: number;
  status: 'OPEN' | 'CLOSED';
  history: string[];
}

export interface TradeRecord {
  id: string;
  token_ticker: string;
  token_url: string; 
  entry_price: number;
  exit_price: number;
  pnl_usd: number;
  pnl_percent: number;
  closed_at: number;
}