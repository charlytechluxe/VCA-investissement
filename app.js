document.addEventListener('DOMContentLoaded', () => {
    // --- Selectors ---
    const monthlyTargetInput = document.getElementById('monthly-target');
    const currentValueInput = document.getElementById('current-value');
    const monthsElapsedInput = document.getElementById('months-elapsed');
    const suggestedAmountDisplay = document.getElementById('suggested-amount');
    const currentTotalValDisplay = document.getElementById('current-total-val');
    const totalBtcDisplay = document.getElementById('total-btc-display');
    const resetBtn = document.getElementById('reset-btn');
    const addMonthBtn = document.getElementById('add-month-btn');
    const btcPriceDisplay = document.getElementById('btc-price');
    const btcTicker = document.getElementById('btc-ticker');
    const syncBtcBtn = document.getElementById('sync-btc-btn');
    const btcAmountContainer = document.getElementById('btc-amount-container');
    const btcAmountInput = document.getElementById('btc-amount');
    const advisorMessage = document.getElementById('advisor-message');
    const heroCard = document.getElementById('hero-card');
    const totalInvestedDisplay = document.getElementById('total-invested-display');
    const avgBuyPriceDisplay = document.getElementById('avg-buy-price-display');
    const perfPercentDisplay = document.getElementById('performance-percent-display');
    const perfEuroDisplay = document.getElementById('performance-euro-display');
    
    // Price Override Selectors
    const editPriceBtn = document.getElementById('edit-price-btn');
    const resetPriceBtn = document.getElementById('reset-price-btn');
    const priceModal = document.getElementById('price-modal');
    const savePriceBtn = document.getElementById('save-price-btn');
    const cancelPriceBtn = document.getElementById('cancel-price-btn');
    const manualPriceInput = document.getElementById('manual-price-input');
    
    // History Selectors
    const addEntryBtn = document.getElementById('add-entry-btn');
    const entryModal = document.getElementById('entry-modal');
    const saveEntryBtn = document.getElementById('save-entry-btn');
    const cancelEntryBtn = document.getElementById('cancel-entry-btn');
    const historyEmpty = document.getElementById('history-empty');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const entryDate = document.getElementById('entry-date');
    const entryAmount = document.getElementById('entry-amount');
    const entryBtcPrice = document.getElementById('entry-btc-price');

    // Reminder Selectors
    const setReminderBtn = document.getElementById('set-reminder-btn');
    const buyDayTag = document.getElementById('buy-day-tag');

    let vcaChart;
    let currentBtcPrice = parseFloat(localStorage.getItem('vca_manual_price')) || 0;
    let isManualPrice = localStorage.getItem('vca_is_manual') === 'true';

    // --- User Portfolio Data from Screenshots ---
    const userDefaults = {
        monthlyTarget: 10,
        currentValue: 50.37,
        monthsElapsed: 7, 
        btcAmount: 0.000858
    };

    // Pre-filled history exact to sum up to 0.000858 BTC
    const manualHistory = [
        { date: '2026-03-16', amountEur: 10, btcPrice: 66667, btcGained: 0.000150 },
        { date: '2026-02-02', amountEur: 10, btcPrice: 83333, btcGained: 0.000120 },
        { date: '2026-01-02', amountEur: 10, btcPrice: 76923, btcGained: 0.000130 },
        { date: '2025-12-02', amountEur: 10, btcPrice: 90909, btcGained: 0.000110 },
        { date: '2025-11-03', amountEur: 10, btcPrice: 71428, btcGained: 0.000140 },
        { date: '2025-10-02', amountEur: 10, btcPrice: 92592, btcGained: 0.000108 },
        { date: '2025-09-02', amountEur: 10, btcPrice: 100000, btcGained: 0.000100 }
    ];

    // --- Loading Data ---
    let savedData = JSON.parse(localStorage.getItem('vca_data_v2') || 'null');
    let historyData = JSON.parse(localStorage.getItem('vca_history') || 'null');
    
    if (!savedData || savedData.monthsElapsed > 100) {
        savedData = userDefaults;
        localStorage.setItem('vca_data_v2', JSON.stringify(savedData));
    }
    
    if (!historyData || historyData.length === 0) {
        historyData = manualHistory;
        localStorage.setItem('vca_history', JSON.stringify(historyData));
    }

    // Initialize UI
    monthlyTargetInput.value = savedData.monthlyTarget;
    currentValueInput.value = savedData.currentValue;
    monthsElapsedInput.value = savedData.monthsElapsed;
    btcAmountInput.value = savedData.btcAmount;
    
    if (parseFloat(savedData.btcAmount) > 0) btcAmountContainer.style.display = 'block';

    function updateAdvisor(suggested, targetMonthly, aheadDelta) {
        const today = new Date();
        const isBuyDay = today.getDate() === 8;
        buyDayTag.style.display = isBuyDay ? 'block' : 'none';

        let message = "";
        let statusClass = "apple-card";

        if (suggested > targetMonthly) {
            const catchUp = suggested - targetMonthly;
            message = `⚠️ En retard. Investis <strong>${suggested.toFixed(0)}€</strong> (${targetMonthly}€ + ${catchUp.toFixed(0)}€ de rattrapage).`;
            statusClass = "apple-card loss";
        } else if (suggested < targetMonthly && suggested > 0) {
            message = `✅ Presque à l'objectif ! Tu n'as besoin que de <strong>${suggested.toFixed(0)}€</strong> ce mois-ci.`;
            statusClass = "apple-card profit";
        } else if (suggested <= 0) {
            message = `🚀 <strong>Objectif atteint !</strong> Tu es en avance de <strong>${aheadDelta.toFixed(0)}€</strong> sur ton plan.`;
            statusClass = "apple-card profit";
        } else {
            message = `✨ Pile sur l'objectif ! Ton virement de <strong>${targetMonthly}€</strong> est prêt.`;
            statusClass = "apple-card";
        }

        if (isBuyDay) {
            advisorMessage.innerHTML = `🚀 <strong>C'est le 8 !</strong> ${message}`;
            // On Buy Day, we keep the card a bit more neutral or specific
            heroCard.className = "apple-card"; 
        } else {
            advisorMessage.innerHTML = message;
            heroCard.className = statusClass;
        }
    }

    function calculateVCA() {
        const targetMonthly = parseFloat(monthlyTargetInput.value) || 10;
        const currentTotal = parseFloat(currentValueInput.value) || 0;
        const months = parseInt(monthsElapsedInput.value) || 1;

        const totalTargetValue = targetMonthly * months;
        const suggestedInvestment = totalTargetValue - currentTotal + targetMonthly;
        const roundedSuggested = Math.ceil(Math.max(0, suggestedInvestment));

        suggestedAmountDisplay.innerText = roundedSuggested.toLocaleString('fr-FR', { 
            style: 'currency', 
            currency: 'EUR',
            maximumFractionDigits: 0 
        });
        currentTotalValDisplay.innerText = currentTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

        // Update Total BTC from History
        const totalBtc = historyData.reduce((acc, entry) => acc + (entry.btcGained || 0), 0);
        if (totalBtcDisplay) totalBtcDisplay.innerText = totalBtc.toFixed(8);
        btcAmountInput.value = totalBtc.toFixed(8);

        updateAdvisor(roundedSuggested, targetMonthly, currentTotal - totalTargetValue);
        calculatePerformance();

        localStorage.setItem('vca_data_v2', JSON.stringify({
            monthlyTarget: targetMonthly, currentValue: currentTotal, monthsElapsed: months,
            btcAmount: totalBtc
        }));

        updateChart(currentTotal, totalTargetValue);
    }

    function calculatePerformance() {
        const historyCost = historyData.reduce((acc, entry) => acc + (entry.amountEur || 0), 0);
        const totalBtc = historyData.reduce((acc, entry) => acc + (entry.btcGained || 0), 0);
        const totalInvested = historyCost; 
        
        const currentVal = parseFloat(currentValueInput.value) || 0;
        const profitLoss = currentVal - totalInvested;
        const roiPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
        const avgBuyPrice = totalBtc > 0 ? totalInvested / totalBtc : 0;

        totalInvestedDisplay.innerText = totalInvested.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
        
        if (avgBuyPriceDisplay) {
            avgBuyPriceDisplay.innerText = avgBuyPrice.toLocaleString('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0
            });
        }
        perfEuroDisplay.innerText = `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
        perfPercentDisplay.innerText = `${profitLoss >= 0 ? '+' : ''}${roiPercent.toFixed(2)}%`;

        perfEuroDisplay.className = `stat-val ${profitLoss >= 0 ? 'text-positive' : 'text-negative'}`;
        perfPercentDisplay.className = `font-bold text-lg ${profitLoss >= 0 ? 'text-positive' : 'text-negative'}`;
    }

    // --- Visualization ---
    function initChart() {
        const ctx = document.getElementById('vca-chart').getContext('2d');
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, 'rgba(0, 122, 255, 0.3)');
        gradient.addColorStop(1, 'transparent');

        vcaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['HISTO', 'CIBLE', 'LIVE'],
                datasets: [{
                    data: [0, 0, 0],
                    borderColor: '#007aff',
                    backgroundColor: gradient,
                    fill: true, tension: 0.5, borderWidth: 4, pointRadius: 0, pointHitRadius: 20
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { display: false }, 
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: isDark ? '#8e8e93' : '#8e8e93', font: { weight: 600, size: 10 } } 
                    } 
                }
            }
        });
    }

    function updateChart(current, target) {
        if (!vcaChart) return;
        vcaChart.data.datasets[0].data = [target * 0.85, target, current];
        vcaChart.update();
    }

    // --- API & Events ---
    async function fetchBtcPrice() {
        if (isManualPrice) return;
        try {
            // Using Binance API for faster real-time data
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR');
            const data = await response.json();
            if (data.price) {
                currentBtcPrice = parseFloat(data.price);
                updatePriceDisplay();
                if (parseFloat(btcAmountInput.value) > 0) syncPortfolioWithBtc();
            }
        } catch (err) { console.error('API Error', err); }
    }

    function updatePriceDisplay() {
        btcPriceDisplay.innerText = currentBtcPrice.toLocaleString('fr-FR', { 
            style: 'currency', 
            currency: 'EUR',
            maximumFractionDigits: 0
        });
        
        if (isManualPrice) {
            btcPriceDisplay.style.color = 'var(--ios-blue)';
            resetPriceBtn.style.display = 'block';
        } else {
            btcPriceDisplay.style.color = 'inherit';
            resetPriceBtn.style.display = 'none';
        }
    }

    function syncPortfolioWithBtc() {
        const amount = parseFloat(btcAmountInput.value) || 0;
        if (amount > 0 && currentBtcPrice > 0) {
            const newVal = amount * currentBtcPrice;
            currentValueInput.value = newVal.toFixed(2);
            calculateVCA();
        }
    }

    function renderHistory() {
        if (historyData.length === 0) {
            historyEmpty.style.display = 'block';
            historyContainer.style.display = 'none';
        } else {
            historyEmpty.style.display = 'none';
            historyContainer.style.display = 'block';
            historyList.innerHTML = '';
            historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
            historyData.forEach(entry => {
                const item = document.createElement('div');
                item.className = 'transaction-item fade-in';
                const dateObj = new Date(entry.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                
                item.innerHTML = `
                    <div class="transaction-info">
                        <div class="symbol-circle">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div>
                            <p class="tx-title">Achat Bitcoin</p>
                            <p class="tx-date">${dateStr}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="tx-amount">${entry.amountEur.toFixed(2)} €</p>
                        <p class="tx-date" style="font-size: 0.65rem;">+${entry.btcGained.toFixed(6)} BTC</p>
                    </div>
                `;
                historyList.appendChild(item);
            });
        }
    }

    // Listeners
    [monthlyTargetInput, currentValueInput, monthsElapsedInput].forEach(el => el.addEventListener('input', calculateVCA));
    addMonthBtn.addEventListener('click', () => { monthsElapsedInput.value = (parseInt(monthsElapsedInput.value) || 0) + 1; calculateVCA(); });
    resetBtn.addEventListener('click', () => { if (confirm('Réinitialiser tout ?')) { localStorage.clear(); location.reload(); } });
    syncBtcBtn.addEventListener('click', () => { btcAmountContainer.style.display = btcAmountContainer.style.display === 'none' ? 'block' : 'none'; });
    btcAmountInput.addEventListener('input', syncPortfolioWithBtc);
    addEntryBtn.addEventListener('click', () => { entryModal.classList.add('active'); entryDate.valueAsDate = new Date(); entryBtcPrice.value = currentBtcPrice || ''; });
    cancelEntryBtn.addEventListener('click', () => entryModal.classList.remove('active'));
    saveEntryBtn.addEventListener('click', () => {
        const date = entryDate.value, amountEur = parseFloat(entryAmount.value), btcPrice = parseFloat(entryBtcPrice.value);
        if (date && amountEur > 0 && btcPrice > 0) {
            const btcGained = amountEur / btcPrice;
            historyData.push({ date, amountEur, btcPrice, btcGained });
            localStorage.setItem('vca_history', JSON.stringify(historyData));
            entryModal.classList.remove('active');
            renderHistory(); calculateVCA();
        }
    });

    // Price Mode Listeners
    editPriceBtn.addEventListener('click', () => {
        manualPriceInput.value = currentBtcPrice.toFixed(0);
        priceModal.classList.add('active');
    });

    cancelPriceBtn.addEventListener('click', () => priceModal.classList.remove('active'));

    savePriceBtn.addEventListener('click', () => {
        const val = parseFloat(manualPriceInput.value);
        if (val > 0) {
            currentBtcPrice = val;
            isManualPrice = true;
            localStorage.setItem('vca_manual_price', currentBtcPrice);
            localStorage.setItem('vca_is_manual', 'true');
            updatePriceDisplay();
            syncPortfolioWithBtc();
            priceModal.classList.remove('active');
        }
    });

    resetPriceBtn.addEventListener('click', () => {
        isManualPrice = false;
        localStorage.removeItem('vca_manual_price');
        localStorage.setItem('vca_is_manual', 'false');
        fetchBtcPrice();
    });

    btcPriceDisplay.addEventListener('click', () => editPriceBtn.click());

    setReminderBtn.addEventListener('click', () => {
        const eventTitle = encodeURIComponent("Achat Bitcoin • Trade Republic");
        const eventDetails = encodeURIComponent("Rappel mensuel pour effectuer l'investissement programmé sur Trade Republic.");
        // RRULE for recurring event on the 8th of every month
        const calendarUrl = `https://calendar.google.com/calendar/r/eventedit?text=${eventTitle}&details=${eventDetails}&recur=RRULE:FREQ=MONTHLY;BYMONTHDAY=8`;
        window.open(calendarUrl, '_blank');
    });

    // checkBuyDay(); // Logic moved to updateAdvisor
    
    // --- Data Management ---
    function exportData() {
        const fullData = {
            vca_data_v2: JSON.parse(localStorage.getItem('vca_data_v2')),
            vca_history: JSON.parse(localStorage.getItem('vca_history')),
            vca_manual_price: localStorage.getItem('vca_manual_price'),
            vca_is_manual: localStorage.getItem('vca_is_manual')
        };
        const dataStr = JSON.stringify(fullData);
        navigator.clipboard.writeText(dataStr).then(() => {
            alert('Données copiées dans le presse-papier ! Tu peux maintenant les coller sur ton iPhone.');
        }).catch(err => {
            console.error('Clipboard Error', err);
            alert('Erreur lors de la copie. Copie manuellement depuis la console.');
            console.log(dataStr);
        });
    }

    function importData() {
        const dataStr = prompt('Colle ici tes données exportées (Code JSON) :');
        if (!dataStr) return;
        try {
            const parsed = JSON.parse(dataStr);
            if (parsed.vca_data_v2) localStorage.setItem('vca_data_v2', JSON.stringify(parsed.vca_data_v2));
            if (parsed.vca_history) localStorage.setItem('vca_history', JSON.stringify(parsed.vca_history));
            if (parsed.vca_manual_price) localStorage.setItem('vca_manual_price', parsed.vca_manual_price);
            if (parsed.vca_is_manual) localStorage.setItem('vca_is_manual', parsed.vca_is_manual);
            
            alert('Importation réussie ! L\'application va redémarrer.');
            location.reload();
        } catch (err) {
            alert('Erreur : Données invalides.');
            console.error(err);
        }
    }

    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', importData);

    fetchBtcPrice();
    setInterval(fetchBtcPrice, 30000); // More frequent updates (30s)
    initChart();
    renderHistory();
    calculateVCA();
});
