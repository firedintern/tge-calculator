// TGE Pressure Calculator
// Sharp. Ruthless. Professional.

class TGECalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsSection = document.getElementById('results');
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedSection = document.getElementById('advancedSection');
        this.savedCalculations = this.loadComparisons();
        this.tooltipEl = document.getElementById('tooltipPopup');
        this._tooltipHideTimer = null;

        this.init();
        this.loadFromURL();
        this.loadSavedData();
        this.renderComparisons();
    }

    init() {
        // Form submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.calculatePressure();
            }
        });

        // Advanced toggle
        this.advancedToggle.addEventListener('click', () => this.toggleAdvanced());

        // Real-time validation on required inputs
        this.form.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', () => this.validateInput(input));
        });

        // Breakdown validation
        ['airdrop', 'publicSale', 'liquidity', 'team', 'other'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.validateBreakdown());
        });

        // Action buttons
        document.getElementById('saveBtn').addEventListener('click', () => this.saveCalculation());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareCalculation());
        document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPNG());
        document.getElementById('compareBtn').addEventListener('click', () => this.addToComparison());

        // Tooltip system
        this.initTooltips();

        // Chart resize
        this.initChartResize();
    }

    // ─── Advanced section ─────────────────────────────────────

    toggleAdvanced() {
        const isOpen = this.advancedSection.classList.contains('open');
        this.advancedSection.classList.toggle('open', !isOpen);
        this.advancedToggle.setAttribute('aria-expanded', String(!isOpen));
        this.advancedSection.setAttribute('aria-hidden', String(isOpen));
        this.advancedToggle.querySelector('.toggle-label').textContent =
            isOpen ? 'Breakdown by category' : 'Hide breakdown';
    }

    // ─── Validation ───────────────────────────────────────────

    validateInput(input) {
        const value = parseFloat(input.value);
        const errorEl = document.getElementById(input.id + 'Error');
        let isValid = true;
        let errorMsg = '';

        if (input.required && (!input.value || isNaN(value))) {
            isValid = false;
            errorMsg = 'Required';
        } else if (!isNaN(value) && value < 0) {
            isValid = false;
            errorMsg = 'Cannot be negative';
        } else if (input.id === 'unlockedPercent' && value > 100) {
            isValid = false;
            errorMsg = 'Max 100%';
        } else if (['airdrop','publicSale','liquidity','team','other'].includes(input.id) && value > 100) {
            isValid = false;
            errorMsg = 'Max 100%';
        } else if (input.id === 'fdv' && value > 1e12) {
            isValid = false;
            errorMsg = 'Unreasonably high';
        }

        input.classList.toggle('error', !isValid);
        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.classList.toggle('show', !isValid);
        }

        return isValid;
    }

    validateForm() {
        let isValid = true;
        this.form.querySelectorAll('input[required]').forEach(input => {
            if (!this.validateInput(input)) isValid = false;
        });
        return isValid;
    }

    validateBreakdown() {
        const airdrop    = parseFloat(document.getElementById('airdrop').value)    || 0;
        const publicSale = parseFloat(document.getElementById('publicSale').value) || 0;
        const liquidity  = parseFloat(document.getElementById('liquidity').value)  || 0;
        const team       = parseFloat(document.getElementById('team').value)       || 0;
        const other      = parseFloat(document.getElementById('other').value)      || 0;
        const unlocked   = parseFloat(document.getElementById('unlockedPercent').value) || 0;

        const total = airdrop + publicSale + liquidity + team + other;
        const warning = document.getElementById('breakdownWarning');

        const mismatch = total > 0 && Math.abs(total - unlocked) > 1;
        warning.classList.toggle('show', mismatch);
        if (mismatch) {
            warning.textContent = `Breakdown total (${total.toFixed(1)}%) ≠ % Unlocked (${unlocked.toFixed(1)}%)`;
            warning.setAttribute('aria-hidden', 'false');
        } else {
            warning.setAttribute('aria-hidden', 'true');
        }
        return !mismatch;
    }

    // ─── Core calculation ─────────────────────────────────────

    calculatePressure() {
        const totalSupply    = parseFloat(document.getElementById('totalSupply').value);
        const fdv            = parseFloat(document.getElementById('fdv').value);
        const unlockedPercent= parseFloat(document.getElementById('unlockedPercent').value);
        const expectedPrice  = parseFloat(document.getElementById('expectedPrice').value) || 0;

        const airdrop    = parseFloat(document.getElementById('airdrop').value)    || 0;
        const publicSale = parseFloat(document.getElementById('publicSale').value) || 0;
        const liquidity  = parseFloat(document.getElementById('liquidity').value)  || 0;
        const team       = parseFloat(document.getElementById('team').value)       || 0;
        const other      = parseFloat(document.getElementById('other').value)      || 0;

        const hasBreakdown = (airdrop + publicSale + liquidity + team + other) > 0;

        // Weighted selling pressure
        let effectivePressure;
        if (hasBreakdown) {
            effectivePressure = (airdrop * 1.0) + (publicSale * 1.0) + (team * 0.3) + (other * 0.2) + (liquidity * 0);
        } else {
            effectivePressure = unlockedPercent * 0.8;
        }

        const initialMcap  = (unlockedPercent / 100) * fdv;
        const potentialSell= (effectivePressure / 100) * fdv;
        const mcfdvRatio   = unlockedPercent;

        // Risk dimensions
        const dumpRisk      = Math.min(effectivePressure * 2, 100);
        const dilutionRisk  = Math.max(0, 100 - unlockedPercent);
        const liquidityScore= Math.min(liquidity * 2, 100);

        // Verdict
        let verdict, verdictClass;
        if (effectivePressure > 40 || unlockedPercent > 60) {
            verdict = 'HIGH';
            verdictClass = 'verdict-high';
        } else if (effectivePressure >= 20 || unlockedPercent >= 30) {
            verdict = 'MEDIUM';
            verdictClass = 'verdict-medium';
        } else {
            verdict = 'LOW';
            verdictClass = 'verdict-low';
        }

        // Description
        const description = this.buildDescription(verdict, effectivePressure, unlockedPercent, airdrop, publicSale, team, liquidity, fdv, hasBreakdown);

        // Update DOM
        const verdictBlock = document.getElementById('verdictBlock');
        verdictBlock.className = `verdict-block ${verdictClass}`;

        document.getElementById('verdictRating').textContent = verdict;
        document.getElementById('verdictDescription').textContent = description;

        if (hasBreakdown) {
            document.getElementById('verdictPressureLine').textContent =
                `Weighted pressure: ${effectivePressure.toFixed(1)}%`;
        } else {
            document.getElementById('verdictPressureLine').textContent = '';
        }

        // Animate metrics
        this.animateValue('dollarAmount', 0, potentialSell, 900, true);
        this.animateValue('circulatingPercent', 0, unlockedPercent, 900, false, '%');
        this.animateValue('initialMcap', 0, initialMcap, 900, true);
        this.animateValue('mcfdvRatio', 0, mcfdvRatio, 900, false, '%');

        // Risk bars
        setTimeout(() => {
            document.getElementById('dumpRiskBar').style.width    = `${dumpRisk}%`;
            document.getElementById('dilutionRiskBar').style.width= `${dilutionRisk}%`;
            document.getElementById('liquidityBar').style.width   = `${liquidityScore}%`;

            document.getElementById('dumpRiskValue').textContent    = `${dumpRisk.toFixed(0)}%`;
            document.getElementById('dilutionRiskValue').textContent= `${dilutionRisk.toFixed(0)}%`;
            document.getElementById('liquidityValue').textContent   = `${liquidityScore.toFixed(0)}%`;
        }, 120);

        // Chart
        this.createUnlockChart(airdrop, publicSale, liquidity, team, other);

        // Price context
        const priceContext = document.getElementById('priceContext');
        if (expectedPrice > 0) {
            const tokensToSell = (effectivePressure / 100) * totalSupply;
            priceContext.innerHTML =
                `<strong>At $${expectedPrice.toFixed(4)}/token —</strong> ` +
                `~${this.formatLargeNumber(tokensToSell)} tokens likely sold, ` +
                `worth ${this.formatCurrency(tokensToSell * expectedPrice)}`;
            priceContext.classList.add('show');
        } else {
            priceContext.classList.remove('show');
        }

        // Show results
        this.showResults();

        // Auto-save
        this.autoSave();
    }

    buildDescription(verdict, effectivePressure, unlocked, airdrop, publicSale, team, liquidity, fdv, hasBreakdown) {
        const parts = [];

        if (verdict === 'HIGH') {
            if (effectivePressure > 40) {
                parts.push(`Effective selling pressure is ${effectivePressure.toFixed(1)}% — a substantial portion of FDV will hit the market at open.`);
            } else {
                parts.push(`${unlocked.toFixed(1)}% of supply unlocks immediately. High float creates inflation risk from day one.`);
            }
        } else if (verdict === 'MEDIUM') {
            parts.push(`Moderate selling pressure at ${effectivePressure.toFixed(1)}%. Monitor initial price action closely.`);
        } else {
            parts.push(`Effective pressure is ${effectivePressure.toFixed(1)}%. Most supply remains locked — healthy vesting structure.`);
        }

        if (hasBreakdown) {
            const highPct = airdrop + publicSale;
            if (highPct > 25) parts.push(`Airdrop + public sale (${highPct.toFixed(1)}%) will sell near-immediately.`);
            if (team > 0) parts.push(`Team tokens unlocked at TGE — a credibility red flag.`);
            if (liquidity > 50) parts.push(`Liquidity allocation (${liquidity.toFixed(1)}%) provides meaningful cushion.`);
        }

        if (unlocked < 10 && fdv > 1e8) {
            parts.push(`Low float + high FDV: future unlock events will be severe.`);
        }

        return parts.join(' ');
    }

    showResults() {
        const el = this.resultsSection;
        el.style.display = 'block';

        // Force reflow before adding class
        void el.offsetHeight;

        el.classList.add('visible');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.classList.add('revealed');
            });
        });

        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─── Animation ────────────────────────────────────────────

    animateValue(id, start, end, duration, isCurrency = false, suffix = '') {
        const el = document.getElementById(id);
        if (!el) return;

        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * eased;

            el.textContent = isCurrency
                ? this.formatCurrency(current)
                : current.toFixed(2) + suffix;

            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    // ─── Chart ────────────────────────────────────────────────

    createUnlockChart(airdrop, publicSale, liquidity, team, other) {
        const section = document.getElementById('chartSection');
        const canvas  = document.getElementById('unlockChart');

        const categories = [
            { name: 'Airdrop',      value: airdrop,    color: 'oklch(62% 0.18 22)' },
            { name: 'Public Sale',  value: publicSale, color: 'oklch(74% 0.15 50)' },
            { name: 'Team',         value: team,       color: 'oklch(76% 0.16 65)' },
            { name: 'Other',        value: other,      color: 'oklch(65% 0.10 220)' },
            { name: 'Liquidity',    value: liquidity,  color: 'oklch(65% 0.13 155)' }
        ].filter(c => c.value > 0);

        if (categories.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        setTimeout(() => {
            const dpr = window.devicePixelRatio || 1;
            const cssWidth = section.offsetWidth || 600;
            const cssHeight = 180;

            canvas.style.width  = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';
            canvas.width  = cssWidth * dpr;
            canvas.height = cssHeight * dpr;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, cssWidth, cssHeight);

            const gap = 8;
            const barW = (cssWidth - gap * (categories.length - 1)) / categories.length;
            const maxVal = Math.max(...categories.map(c => c.value));
            const availH = cssHeight - 54;

            categories.forEach((cat, i) => {
                const x = i * (barW + gap);
                const barH = (cat.value / maxVal) * availH;
                const y = availH - barH;

                ctx.fillStyle = cat.color;
                ctx.fillRect(x, y, barW, barH);

                // Value label above bar
                ctx.fillStyle = 'oklch(92% 0.008 60)';
                ctx.font = `700 13px "Barlow Condensed", sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(`${cat.value.toFixed(1)}%`, x + barW / 2, y - 6);

                // Category label below
                ctx.fillStyle = 'oklch(55% 0.010 60)';
                ctx.font = `600 11px "Mada", sans-serif`;
                ctx.fillText(cat.name, x + barW / 2, availH + 20);
            });
        }, 80);
    }

    initChartResize() {
        let timer;
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const section = document.getElementById('chartSection');
                if (section && section.style.display !== 'none') {
                    const data = this.getFormData();
                    if (data) {
                        this.createUnlockChart(
                            parseFloat(data.airdrop)    || 0,
                            parseFloat(data.publicSale) || 0,
                            parseFloat(data.liquidity)  || 0,
                            parseFloat(data.team)       || 0,
                            parseFloat(data.other)      || 0
                        );
                    }
                }
            }, 200);
        });
    }

    // ─── Tooltips ─────────────────────────────────────────────

    initTooltips() {
        document.addEventListener('mouseover', (e) => {
            const btn = e.target.closest('.info-btn[data-tooltip]');
            if (btn) this.showTooltip(btn);
        });

        document.addEventListener('mouseout', (e) => {
            const btn = e.target.closest('.info-btn[data-tooltip]');
            if (btn) this.hideTooltip();
        });

        // Click support for touch devices
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.info-btn[data-tooltip]');
            if (btn) {
                e.stopPropagation();
                if (this.tooltipEl.classList.contains('visible') && this._activeTooltipBtn === btn) {
                    this.hideTooltip();
                } else {
                    this.showTooltip(btn);
                }
            } else {
                this.hideTooltip();
            }
        });
    }

    showTooltip(btn) {
        clearTimeout(this._tooltipHideTimer);
        this._activeTooltipBtn = btn;
        const text = btn.getAttribute('data-tooltip');
        if (!text) return;

        this.tooltipEl.textContent = text;

        // Position anchored to button — place it, then make visible
        const btnRect = btn.getBoundingClientRect();

        // Start above the button; will flip below if too close to top
        let top  = btnRect.top + window.scrollY - 8;
        let left = btnRect.left + btnRect.width / 2;

        // Use transform to center horizontally and shift up by 100%
        this.tooltipEl.style.left = left + 'px';
        this.tooltipEl.style.top  = top + 'px';
        this.tooltipEl.style.transform = 'translate(-50%, -100%)';
        this.tooltipEl.removeAttribute('aria-hidden');
        this.tooltipEl.classList.add('visible');
    }

    hideTooltip() {
        this._tooltipHideTimer = setTimeout(() => {
            this.tooltipEl.classList.remove('visible');
            this.tooltipEl.setAttribute('aria-hidden', 'true');
            this._activeTooltipBtn = null;
        }, 100);
    }

    // ─── Persistence ──────────────────────────────────────────

    saveCalculation() {
        localStorage.setItem('tge-calc-save', JSON.stringify(this.getFormData()));
        this.showToast('Saved');
    }

    autoSave() {
        localStorage.setItem('tge-calc-autosave', JSON.stringify(this.getFormData()));
    }

    loadSavedData() {
        const saved = localStorage.getItem('tge-calc-autosave');
        if (!saved) return;
        try {
            this.populateForm(JSON.parse(saved));
        } catch (_) {}
    }

    shareCalculation() {
        const data = this.getFormData();
        const params = new URLSearchParams();
        Object.entries(data).forEach(([k, v]) => { if (v) params.set(k, v); });
        const url = `${location.origin}${location.pathname}?${params}`;

        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Link copied');
        }).catch(() => {
            prompt('Share this URL:', url);
        });
    }

    shareOnX() {
        const name    = document.getElementById('projectName').value || 'this project';
        const rating  = document.getElementById('verdictRating').textContent;
        const sell    = document.getElementById('dollarAmount').textContent;

        const text = `Analyzed ${name}'s TGE selling pressure\n\nVerdict: ${rating}\nSell pressure: ${sell}\n\n${location.href}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'width=550,height=420');
    }

    exportToPNG() {
        this.showToast('Opening print dialog…');
        setTimeout(() => window.print(), 800);
    }

    // ─── Comparison ───────────────────────────────────────────

    addToComparison() {
        const rating = document.getElementById('verdictRating').textContent;
        if (!rating || rating === '—') {
            this.showToast('Run analysis first');
            return;
        }

        const data = {
            ...this.getFormData(),
            rating,
            sellPressure: document.getElementById('dollarAmount').textContent,
            ts: Date.now()
        };

        this.savedCalculations.push(data);
        if (this.savedCalculations.length > 3) this.savedCalculations.shift();

        localStorage.setItem('tge-calc-comparisons', JSON.stringify(this.savedCalculations));
        this.renderComparisons();
        this.showToast('Added to comparison');
    }

    loadComparisons() {
        try {
            return JSON.parse(localStorage.getItem('tge-calc-comparisons') || '[]');
        } catch (_) { return []; }
    }

    renderComparisons() {
        const section = document.getElementById('comparisonSection');
        const grid    = document.getElementById('comparisonGrid');
        const count   = document.getElementById('comparisonCount');

        if (this.savedCalculations.length === 0) {
            section.classList.remove('show');
            return;
        }

        section.classList.add('show');
        count.textContent = `${this.savedCalculations.length} / 3`;
        grid.innerHTML = '';

        this.savedCalculations.forEach((calc, i) => {
            const ratingClass = (calc.rating || '').toLowerCase();
            const card = document.createElement('div');
            card.className = 'comparison-card';
            card.innerHTML = `
                <button class="comparison-remove" onclick="calculator.removeComparison(${i})" aria-label="Remove comparison">×</button>
                <div class="comparison-card-name">${calc.projectName || `Project ${i + 1}`}</div>
                <div class="comparison-card-rating ${ratingClass}">${calc.rating}</div>
                <div class="comparison-stat">
                    <span>Sell pressure</span>
                    <span class="comparison-stat-val">${calc.sellPressure}</span>
                </div>
                <div class="comparison-stat">
                    <span>% Unlocked</span>
                    <span class="comparison-stat-val">${calc.unlockedPercent}%</span>
                </div>
                <div class="comparison-stat">
                    <span>FDV</span>
                    <span class="comparison-stat-val">${this.formatCurrency(parseFloat(calc.fdv) || 0)}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    removeComparison(i) {
        this.savedCalculations.splice(i, 1);
        localStorage.setItem('tge-calc-comparisons', JSON.stringify(this.savedCalculations));
        this.renderComparisons();
    }

    // ─── URL loading ──────────────────────────────────────────

    loadFromURL() {
        const params = new URLSearchParams(location.search);
        if (!params.size) return;
        const data = {};
        params.forEach((v, k) => { data[k] = v; });
        this.populateForm(data);
        if (data.totalSupply && data.fdv && data.unlockedPercent) {
            setTimeout(() => {
                if (this.validateForm()) this.calculatePressure();
            }, 100);
        }
    }

    // ─── Form helpers ─────────────────────────────────────────

    getFormData() {
        return {
            projectName:    document.getElementById('projectName').value,
            totalSupply:    document.getElementById('totalSupply').value,
            fdv:            document.getElementById('fdv').value,
            unlockedPercent:document.getElementById('unlockedPercent').value,
            expectedPrice:  document.getElementById('expectedPrice').value,
            airdrop:        document.getElementById('airdrop').value,
            publicSale:     document.getElementById('publicSale').value,
            liquidity:      document.getElementById('liquidity').value,
            team:           document.getElementById('team').value,
            other:          document.getElementById('other').value
        };
    }

    populateForm(data) {
        Object.entries(data).forEach(([k, v]) => {
            const el = document.getElementById(k);
            if (el && v !== undefined && v !== null) el.value = v;
        });

        const hasAdvanced = ['airdrop','publicSale','liquidity','team','other'].some(k => data[k]);
        if (hasAdvanced && !this.advancedSection.classList.contains('open')) {
            this.toggleAdvanced();
        }
    }

    clearForm() {
        if (!confirm('Clear all inputs and results?')) return;
        this.form.reset();

        // Hide results
        const el = this.resultsSection;
        el.classList.remove('revealed');
        setTimeout(() => {
            el.classList.remove('visible');
            el.style.display = 'none';
        }, 400);

        // Clear errors
        this.form.querySelectorAll('input').forEach(input => {
            input.classList.remove('error');
            const err = document.getElementById(input.id + 'Error');
            if (err) err.classList.remove('show');
        });

        document.getElementById('verdictBlock').className = 'verdict-block';
        localStorage.removeItem('tge-calc-autosave');
        this.showToast('Cleared');
    }

    // ─── Utilities ────────────────────────────────────────────

    formatCurrency(value) {
        if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
        if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
        if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
        return '$' + value.toFixed(2);
    }

    formatLargeNumber(value) {
        if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
        if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
        if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
        return value.toFixed(0);
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
    }
}

// Boot
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new TGECalculator();
});
