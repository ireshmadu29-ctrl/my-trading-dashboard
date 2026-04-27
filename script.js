// State Management
const state = {
    isConnected: false,
    currentCoin: 'BNBUSDT',
    currentPrice: 0,
    candles15m: [],
    candles1h: [],
    orderFlowData: [],
    aggressivePoints: [],
    whaleOrders: [],
    sniperSetups: [],
    smcStructure: [],
    tradeHistory: [],
    chart: null,
    orderFlowChart: null
};

const elements = {
    coinSelect: document.getElementById('coinSelect'),
    connectBtn: document.getElementById('connectBtn'),
    scanBtn: document.getElementById('scanBtn'),
    timeframeSelect: document.getElementById('timeframeSelect'),
    trendStatus: document.getElementById('trendStatus'),
    mtfStatus: document.getElementById('mtfStatus'),
    chochStatus: document.getElementById('chochStatus'),
    liquidityStatus: document.getElementById('liquidityStatus'),
    fvgStatus: document.getElementById('fvgStatus'),
    tradeScore: document.getElementById('tradeScore'),
    candleChart: document.getElementById('candleChart'),
    orderFlowChart: document.getElementById('orderFlowChart'),
    volumeProfileContainer: document.getElementById('volumeProfileContainer'),
    sniperSetups: document.getElementById('sniperSetups'),
    aggressivePointsList: document.getElementById('aggressivePointsList'),
    whaleOrdersList: document.getElementById('whaleOrdersList'),
    structureList: document.getElementById('structureList'),
    displayPrice: document.getElementById('displayPrice'),
    entryPrice: document.getElementById('entryPrice'),
    takeProfit: document.getElementById('takeProfit'),
    stopLoss: document.getElementById('stopLoss'),
    quantity: document.getElementById('quantity'),
    leverage: document.getElementById('leverage'),
    confidence: document.getElementById('confidence'),
    riskAmount: document.getElementById('riskAmount'),
    rewardAmount: document.getElementById('rewardAmount'),
    rrRatio: document.getElementById('rrRatio'),
    positionSize: document.getElementById('positionSize'),
    confirmTradeBtn: document.getElementById('confirmTradeBtn'),
    tradeHistory: document.getElementById('tradeHistory'),
    exportBtn: document.getElementById('exportBtn')
};

// Event Listeners
elements.connectBtn.addEventListener('click', toggleConnection);
elements.scanBtn.addEventListener('click', scanAllCoins);
elements.coinSelect.addEventListener('change', changeCoin);
elements.timeframeSelect.addEventListener('change', updateCharts);
elements.entryPrice.addEventListener('input', calculateTradeMetrics);
elements.takeProfit.addEventListener('input', calculateTradeMetrics);
elements.stopLoss.addEventListener('input', calculateTradeMetrics);
elements.quantity.addEventListener('input', calculateTradeMetrics);
elements.leverage.addEventListener('change', calculateTradeMetrics);
elements.confirmTradeBtn.addEventListener('click', confirmTrade);
elements.exportBtn.addEventListener('click', exportTradeHistory);

// Initialize Charts
function initCharts() {
    const ctx1 = elements.candleChart.getContext('2d');
    const ctx2 = elements.orderFlowChart.getContext('2d');

    state.chart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Candles',
                    data: [],
                    backgroundColor: 'rgba(100, 150, 200, 0.5)',
                    borderColor: '#64c8ff',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#aaa', font: { size: 10 } } }
            },
            scales: {
                x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(100, 150, 255, 0.1)' } },
                y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(100, 150, 255, 0.1)' } }
            }
        }
    });

    state.orderFlowChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Buy Volume',
                    data: [],
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: '#2ecc71',
                    borderWidth: 1
                },
                {
                    label: 'Sell Volume',
                    data: [],
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: '#e74c3c',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: '#aaa', font: { size: 10 } } }
            },
            scales: {
                x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(100, 150, 255, 0.1)' } },
                y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(100, 150, 255, 0.1)' } }
            }
        }
    });
}

// EMA Calculation (Fixed)
function ema(data, period) {
    if (data.length < period) return data;
    const k = 2 / (period + 1);
    let emaValues = [data.slice(0, period).reduce((a, b) => a + b) / period];
    for (let i = period; i < data.length; i++) {
        emaValues.push(data[i] * k + emaValues[emaValues.length - 1] * (1 - k));
    }
    return emaValues;
}

// Trend Detection (Improved)
function detectTrend(closes) {
    if (closes.length < 200) return 'INSUFFICIENT';
    const e50 = ema(closes, 50);
    const e200 = ema(closes, 200);
    const lastIdx = e50.length - 1;
    
    if (lastIdx < 0) return 'WAIT';
    const trend = e50[lastIdx] > e200[lastIdx] ? 'BULL' : 'BEAR';
    const strength = Math.abs(e50[lastIdx] - e200[lastIdx]) / e200[lastIdx] * 100;
    return { trend, strength: strength.toFixed(2) };
}

// CHOCH Detection (Improved)
function detectCHOCH(closes, highs, lows) {
    if (closes.length < 4) return 'WAIT';
    const i = closes.length - 1;
    const recent = closes.slice(-10);
    const maxHigh = Math.max(...highs.slice(-20));
    const minLow = Math.min(...lows.slice(-20));
    
    if (closes[i] > maxHigh * 1.001) return 'BUY_CHOCH';
    if (closes[i] < minLow * 0.999) return 'SELL_CHOCH';
    return 'NONE';
}

// Liquidity Sweep Detection (Improved)
function detectSweep(highs, lows, closes) {
    if (highs.length < 5) return 'NONE';
    const i = highs.length - 1;
    const recent20High = Math.max(...highs.slice(-20));
    const recent20Low = Math.min(...lows.slice(-20));
    
    if (highs[i] > recent20High * 1.002 && closes[i] < closes[i-1]) return 'BUY_SWEEP';
    if (lows[i] < recent20Low * 0.998 && closes[i] > closes[i-1]) return 'SELL_SWEEP';
    return 'NONE';
}

// FVG Detection (Fair Value Gap)
function detectFVG(opens, closes, highs, lows) {
    if (closes.length < 3) return null;
    for (let i = closes.length - 3; i < closes.length; i++) {
        const h1 = highs[i-2], l3 = lows[i];
        if (l3 > h1) return 'BULL_FVG';
        const l1 = lows[i-2], h3 = highs[i];
        if (h3 < l1) return 'BEAR_FVG';
    }
    return null;
}

// Trade Score (Improved)
function calculateTradeScore(trend15m, trend1h, choch, sweep, fvg, aggression) {
    let score = 0;
    
    // Trend alignment (30 points)
    if (trend15m.trend === trend1h.trend) {
        score += 25;
        if (parseFloat(trend15m.strength) > 1) score += 5;
    }
    
    // CHOCH (25 points)
    if (choch !== 'NONE') {
        score += 20;
        if (choch.includes('BUY') && trend15m.trend === 'BULL') score += 5;
        if (choch.includes('SELL') && trend15m.trend === 'BEAR') score += 5;
    }
    
    // Liquidity Sweep (20 points)
    if (sweep !== 'NONE') {
        score += 15;
        if (sweep.includes('BUY') && trend15m.trend === 'BULL') score += 5;
        if (sweep.includes('SELL') && trend15m.trend === 'BEAR') score += 5;
    }
    
    // FVG (15 points)
    if (fvg) score += 15;
    
    // Aggression (15 points)
    if (aggression > 75) score += 15;
    else if (aggression > 70) score += 10;
    else if (aggression > 65) score += 5;
    
    return Math.min(score, 100);
}

// Fetch Real Data from Binance
async function fetchBinanceData(symbol, interval, limit = 200) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        if (!response.ok) throw new Error('Binance API error');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return generateMockData(limit);
    }
}

// Generate Mock Data (Fallback)
function generateMockData(count = 200) {
    const data = [];
    let basePrice = 635;
    for (let i = 0; i < count; i++) {
        const open = basePrice + (Math.random() - 0.5) * 2;
        const close = open + (Math.random() - 0.5) * 2;
        const high = Math.max(open, close) + Math.random() * 0.5;
        const low = Math.min(open, close) - Math.random() * 0.5;
        const volume = Math.floor(Math.random() * 10000) + 1000;
        data.push([0, open, high, low, close, volume]);
        basePrice = close;
    }
    return data;
}

// Detect Aggressive Points
function detectAggressivePoints() {
    const data = state.orderFlowData;
    const aggressive = [];
    
    data.forEach(item => {
        const total = item.buyVolume + item.sellVolume;
        const imbalance = Math.abs(item.buyVolume - item.sellVolume) / total;
        const aggression = (1 - imbalance) * 100;
        
        if (aggression > 70) {
            aggressive.push({
                price: item.price,
                buyVolume: item.buyVolume,
                sellVolume: item.sellVolume,
                aggression: aggression.toFixed(2),
                side: item.buyVolume > item.sellVolume ? 'BUY' : 'SELL'
            });
        }
    });
    
    state.aggressivePoints = aggressive.sort((a, b) => b.aggression - a.aggression);
    renderAggressivePoints();
}

// Detect Whale Orders
function detectWhaleOrders() {
    const data = state.orderFlowData;
    const whales = [];
    const avgVolume = data.reduce((sum, item) => sum + Math.max(item.buyVolume, item.sellVolume), 0) / data.length;
    
    data.forEach(item => {
        const maxVol = Math.max(item.buyVolume, item.sellVolume);
        if (maxVol > avgVolume * 3) {
            whales.push({
                price: item.price,
                side: item.buyVolume > item.sellVolume ? 'BUY' : 'SELL',
                volume: maxVol,
                ratio: (maxVol / Math.min(item.buyVolume, item.sellVolume)).toFixed(2)
            });
        }
    });
    
    state.whaleOrders = whales.sort((a, b) => b.volume - a.volume).slice(0, 5);
    renderWhaleOrders();
}

// Generate Order Flow Data
async function generateOrderFlowData() {
    const basePrice = state.currentPrice || getInitialPrice(state.currentCoin);
    const data = [];
    
    for (let i = -15; i <= 15; i++) {
        const price = basePrice + i * 0.05;
        const buyVolume = Math.floor(Math.random() * 2000) + 200;
        const sellVolume = Math.floor(Math.random() * 2000) + 200;
        
        data.push({
            price: parseFloat(price.toFixed(2)),
            buyVolume,
            sellVolume
        });
    }
    
    state.orderFlowData = data;
    detectAggressivePoints();
    detectWhaleOrders();
    updateOrderFlowChart();
    updateVolumeProfile();
}

// Update SMC Analysis
async function updateSMCAnalysis() {
    const candles15m = state.candles15m;
    const candles1h = state.candles1h;
    
    if (candles15m.length < 10 || candles1h.length < 10) return;
    
    const closes15m = candles15m.map(c => parseFloat(c[4]));
    const highs15m = candles15m.map(c => parseFloat(c[2]));
    const lows15m = candles15m.map(c => parseFloat(c[3]));
    const closes1h = candles1h.map(c => parseFloat(c[4]));
    const highs1h = candles1h.map(c => parseFloat(c[2]));
    const lows1h = candles1h.map(c => parseFloat(c[3]));
    
    const trend15m = detectTrend(closes15m);
    const trend1h = detectTrend(closes1h);
    const choch = detectCHOCH(closes15m, highs15m, lows15m);
    const sweep = detectSweep(highs15m, lows15m, closes15m);
    const fvg = detectFVG(candles15m.map(c => parseFloat(c[1])), closes15m, highs15m, lows15m);
    
    const avgAggression = state.aggressivePoints.length > 0 
        ? (state.aggressivePoints.reduce((sum, p) => sum + parseFloat(p.aggression), 0) / state.aggressivePoints.length)
        : 0;
    
    const score = calculateTradeScore(trend15m, trend1h, choch, sweep, fvg, avgAggression);
    
    // Update UI
    elements.trendStatus.textContent = `${trend15m.trend} (${trend15m.strength}%)`;
    elements.mtfStatus.textContent = trend15m.trend === trend1h.trend ? '✓ ALIGNED' : '✗ DIVERGED';
    elements.chochStatus.textContent = choch;
    elements.liquidityStatus.textContent = sweep;
    elements.fvgStatus.textContent = fvg || 'NONE';
    elements.tradeScore.textContent = score;
    
    // Color coding
    elements.tradeScore.style.color = score > 80 ? '#2ecc71' : score > 60 ? '#f39c12' : '#e74c3c';
}

// Scan All Coins
async function scanAllCoins() {
    elements.scanBtn.textContent = '🔄 Scanning...';
    elements.scanBtn.disabled = true;
    
    const coins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT'];
    const results = [];
    
    for (const coin of coins) {
        try {
            const data15m = await fetchBinanceData(coin, '15m', 100);
            const data1h = await fetchBinanceData(coin, '1h', 100);
            
            const closes15m = data15m.map(c => parseFloat(c[4]));
            const closes1h = data1h.map(c => parseFloat(c[4]));
            const highs15m = data15m.map(c => parseFloat(c[2]));
            const lows15m = data15m.map(c => parseFloat(c[3]));
            
            const trend15m = detectTrend(closes15m);
            const trend1h = detectTrend(closes1h);
            const choch = detectCHOCH(closes15m, highs15m, lows15m);
            const sweep = detectSweep(highs15m, lows15m, closes15m);
            const fvg = detectFVG(data15m.map(c => parseFloat(c[1])), closes15m, highs15m, lows15m);
            
            const score = calculateTradeScore(trend15m, trend1h, choch, sweep, fvg, 75);
            
            if (score > 65) {
                results.push({
                    coin,
                    trend: trend15m.trend,
                    score,
                    choch,
                    sweep,
                    fvg
                });
            }
        } catch (error) {
            console.error(`Error scanning ${coin}:`, error);
        }
    }
    
    state.sniperSetups = results.sort((a, b) => b.score - a.score);
    renderSniperSetups();
    
    elements.scanBtn.textContent = '🔍 Scan Market';
    elements.scanBtn.disabled = false;
}

// Render Functions
function renderSniperSetups() {
    const box = elements.sniperSetups;
    document.getElementById('sniperCount').textContent = state.sniperSetups.length;
    
    if (state.sniperSetups.length === 0) {
        box.innerHTML = '<p class="empty-state">No high-quality setups found</p>';
        return;
    }
    
    box.innerHTML = state.sniperSetups.slice(0, 5).map((setup, idx) => `
        <div class="list-item sniper">
            <div class="list-item-header">
                <span>#${idx + 1} ${setup.coin}</span>
                <span style="color: #f39c12">Score: ${setup.score}</span>
            </div>
            <div class="list-item-details">
                <div>Trend: ${setup.trend} | CHOCH: ${setup.choch}</div>
                <div>Sweep: ${setup.sweep} | FVG: ${setup.fvg || 'NONE'}</div>
            </div>
        </div>
    `).join('');
}

function renderAggressivePoints() {
    const box = elements.aggressivePointsList;
    document.getElementById('aggressiveCount').textContent = state.aggressivePoints.length;
    
    if (state.aggressivePoints.length === 0) {
        box.innerHTML = '<p class="empty-state">No aggressive points</p>';
        return;
    }
    
    box.innerHTML = state.aggressivePoints.slice(0, 5).map((point, idx) => `
        <div class="list-item aggressive">
            <div class="list-item-header">
                <span>#${idx + 1} $${point.price}</span>
                <span style="color: ${point.side === 'BUY' ? '#2ecc71' : '#e74c3c'}">${point.aggression}%</span>
            </div>
            <div class="list-item-details">
                <div>${point.side} | Buy: ${point.buyVolume} | Sell: ${point.sellVolume}</div>
            </div>
        </div>
    `).join('');
}

function renderWhaleOrders() {
    const box = elements.whaleOrdersList;
    document.getElementById('whaleCount').textContent = state.whaleOrders.length;
    
    if (state.whaleOrders.length === 0) {
        box.innerHTML = '<p class="empty-state">No whale orders</p>';
        return;
    }
    
    box.innerHTML = state.whaleOrders.map((whale, idx) => `
        <div class="list-item whale">
            <div class="list-item-header">
                <span>#${idx + 1} $${whale.price}</span>
                <span style="color: #9b59b6">${whale.side} Whale</span>
            </div>
            <div class="list-item-details">
                <div>Volume: ${whale.volume} | Ratio: 1:${whale.ratio}</div>
            </div>
        </div>
    `).join('');
}

function updateOrderFlowChart() {
    const labels = state.orderFlowData.map(d => d.price.toFixed(2));
    const buyData = state.orderFlowData.map(d => d.buyVolume);
    const sellData = state.orderFlowData.map(d => d.sellVolume);
    
    if (state.orderFlowChart) {
        state.orderFlowChart.data.labels = labels;
        state.orderFlowChart.data.datasets[0].data = buyData;
        state.orderFlowChart.data.datasets[1].data = sellData;
        state.orderFlowChart.update();
    }
}

function updateVolumeProfile() {
    const container = elements.volumeProfileContainer;
    const maxVolume = Math.max(...state.orderFlowData.map(d => Math.max(d.buyVolume, d.sellVolume)));
    
    container.innerHTML = state.orderFlowData.map(item => {
        const maxVol = Math.max(item.buyVolume, item.sellVolume);
        const isAggressive = state.aggressivePoints.some(p => p.price === item.price);
        const width = (maxVol / maxVolume) * 100;
        
        return `
            <div class="volume-bar ${isAggressive ? 'aggressive' : ''}">
                <span>$${item.price}</span>
                <div style="width: ${width}%; background: ${item.buyVolume > item.sellVolume ? '#2ecc71' : '#e74c3c'}"></div>
            </div>
        `;
    }).join('');
}

// Connection Management
function toggleConnection() {
    state.isConnected = !state.isConnected;
    
    if (state.isConnected) {
        elements.connectBtn.textContent = '🔌 Disconnect';
        startLiveData();
    } else {
        stopLiveData();
        elements.connectBtn.textContent = '🔌 Connect Real-Time';
    }
}

let dataUpdateInterval;

async function startLiveData() {
    // Fetch initial data
    state.candles15m = await fetchBinanceData(state.currentCoin, '15m', 200);
    state.candles1h = await fetchBinanceData(state.currentCoin, '1h', 200);
    state.currentPrice = parseFloat(state.candles15m[state.candles15m.length - 1][4]);
    elements.displayPrice.value = state.currentPrice.toFixed(2);
    
    await generateOrderFlowData();
    await updateSMCAnalysis();
    
    // Update every 5 seconds
    dataUpdateInterval = setInterval(async () => {
        state.candles15m = await fetchBinanceData(state.currentCoin, '15m', 200);
        state.currentPrice = parseFloat(state.candles15m[state.candles15m.length - 1][4]);
        elements.displayPrice.value = state.currentPrice.toFixed(2);
        await generateOrderFlowData();
        await updateSMCAnalysis();
    }, 5000);
}

function stopLiveData() {
    clearInterval(dataUpdateInterval);
}

// Update Charts
function updateCharts() {
    if (state.candles15m.length === 0) return;
    
    const labels = state.candles15m.slice(-50).map((c, i) => i.toString());
    const closes = state.candles15m.slice(-50).map(c => parseFloat(c[4]));
    
    if (state.chart) {
        state.chart.data.labels = labels;
        state.chart.data.datasets[0].data = closes;
        state.chart.update();
    }
}

// Coin Change
function changeCoin() {
    state.currentCoin = elements.coinSelect.value;
    if (state.isConnected) {
        stopLiveData();
        startLiveData();
    }
}

// Trade Calculations
function calculateTradeMetrics() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const tp = parseFloat(elements.takeProfit.value) || 0;
    const sl = parseFloat(elements.stopLoss.value) || 0;
    const qty = parseFloat(elements.quantity.value) || 0;
    const leverage = parseFloat(elements.leverage.value) || 1;
    
    if (entry && tp && sl && qty) {
        const risk = (entry - sl) * qty * leverage;
        const reward = (tp - entry) * qty * leverage;
        const ratio = reward / risk || 0;
        const posSize = qty * leverage;
        
        elements.riskAmount.textContent = `$${risk.toFixed(2)}`;
        elements.rewardAmount.textContent = `$${reward.toFixed(2)}`;
        elements.rrRatio.textContent = `1:${ratio.toFixed(2)}`;
        elements.positionSize.textContent = `${posSize.toFixed(2)} USDT`;
        
        elements.riskAmount.style.color = risk > 0 ? '#e74c3c' : '#2ecc71';
        elements.rewardAmount.style.color = reward > 0 ? '#2ecc71' : '#e74c3c';
    }
}

// Confirm Trade
function confirmTrade() {
    const entry = parseFloat(elements.entryPrice.value);
    const tp = parseFloat(elements.takeProfit.value);
    const sl = parseFloat(elements.stopLoss.value);
    const qty = parseFloat(elements.quantity.value);
    const leverage = parseFloat(elements.leverage.value);
    const score = parseInt(elements.tradeScore.textContent);
    
    if (!entry || !tp || !sl || !qty) {
        alert('Please fill all trade details');
        return;
    }
    
    const trade = {
        id: Date.now(),
        coin: state.currentCoin,
        entry,
        tp,
        sl,
        qty,
        leverage,
        score,
        timestamp: new Date().toLocaleString(),
        status: 'OPEN'
    };
    
    state.tradeHistory.push(trade);
    localStorage.setItem('tradeHistory', JSON.stringify(state.tradeHistory));
    renderTradeHistory();
    alert('✓ Trade confirmed!');
    
    elements.entryPrice.value = '';
    elements.takeProfit.value = '';
    elements.stopLoss.value = '';
    elements.quantity.value = '';
}

function renderTradeHistory() {
    if (state.tradeHistory.length === 0) {
        elements.tradeHistory.innerHTML = '<p class="empty-state">No trades yet</p>';
        return;
    }
    
    elements.tradeHistory.innerHTML = state.tradeHistory
        .sort((a, b) => b.id - a.id)
        .slice(0, 10)
        .map(trade => `
            <div class="trade-item">
                <div class="list-item-header">
                    <span>${trade.coin}</span>
                    <span>${trade.status} | Score: ${trade.score}</span>
                </div>
                <div class="list-item-details">
                    <div>Entry: $${trade.entry} | TP: $${trade.tp} | SL: $${trade.sl}</div>
                    <div>Qty: ${trade.qty} | Leverage: ${trade.leverage}x</div>
                    <div>${trade.timestamp}</div>
                </div>
            </div>
        `).join('');
}

function exportTradeHistory() {
    const data = JSON.stringify(state.tradeHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function getInitialPrice(coin) {
    const prices = {
        'BTCUSDT': 43000, 'ETHUSDT': 2300, 'SOLUSDT': 190, 'BNBUSDT': 635,
        'XRPUSDT': 2.5, 'ADAUSDT': 0.98, 'DOGEUSDT': 0.38, 'AVAXUSDT': 40,
        'LINKUSDT': 28, 'MATICUSDT': 0.55
    };
    return prices[coin] || 43000;
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    state.currentPrice = getInitialPrice(state.currentCoin);
    elements.displayPrice.value = state.currentPrice.toFixed(2);
    const saved = localStorage.getItem('tradeHistory');
    if (saved) {
        state.tradeHistory = JSON.parse(saved);
        renderTradeHistory();
    }
});