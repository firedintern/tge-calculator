// TGE Pressure Calculator
// Sharp. Ruthless. Professional.

class TGECalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsSection = document.getElementById('results');
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedSection = document.getElementById('advancedSection');
        this.savedCalculations = this.loadComparisons();

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
                // Button press feedback
                const btn = document.getElementById('calculateBtn');
                btn.classList.add('firing');
                setTimeout(() => btn.classList.remove('firing'), 160);
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

        // Update DOM — set content before reveal
        const verdictBlock = document.getElementById('verdictBlock');
        verdictBlock.className = `verdict-block ${verdictClass}`;

        document.getElementById('verdictRating').textContent = verdict;
        document.getElementById('verdictDescription').textContent = description;
        document.getElementById('verdictPressureLine').textContent =
            hasBreakdown ? `Weighted pressure: ${effectivePressure.toFixed(1)}%` : '';

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

        // Chart
        this.createUnlockChart(airdrop, publicSale, liquidity, team, other);

        // Show section, then fire the kinetic sequence
        this.showResults(() => {
            this.animateVerdict(verdictClass);
            this.animateMetrics(potentialSell, unlockedPercent, initialMcap, mcfdvRatio);
            this.animateRiskBars(dumpRisk, dilutionRisk, liquidityScore);
        });

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

    showResults(onVisible) {
        const el = this.resultsSection;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        el.style.display = 'block';
        el.classList.add('visible');
        void el.offsetHeight;

        if (reduced) {
            onVisible?.();
            el.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            return;
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Small delay lets the scroll settle before the impact hits
        setTimeout(() => onVisible?.(), 180);
    }

    // ─── Kinetic sequence ─────────────────────────────────────

    animateVerdict(verdictClass) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ratingEl = document.getElementById('verdictRating');
        const blockEl  = document.getElementById('verdictBlock');
        const descEl   = document.getElementById('verdictDescription');
        const lineEl   = document.getElementById('verdictPressureLine');

        if (reduced) return;

        // 1. Flash the block — brief color burst then settle
        blockEl.animate([
            { filter: 'brightness(2.2)', offset: 0 },
            { filter: 'brightness(1)',   offset: 0.25 },
            { filter: 'brightness(1)',   offset: 1 }
        ], { duration: 500, easing: 'ease-out', fill: 'none' });

        // 2. Verdict text slams down from oversized
        ratingEl.animate([
            { transform: 'scale(1.55) translateY(-6px)', opacity: 0,   offset: 0 },
            { transform: 'scale(1.04) translateY(2px)',  opacity: 1,   offset: 0.45 },
            { transform: 'scale(0.99) translateY(0px)',  opacity: 1,   offset: 0.65 },
            { transform: 'scale(1)    translateY(0)',    opacity: 1,   offset: 1 }
        ], {
            duration: 480,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards'
        });

        // 3. Description fades up after the slam
        descEl.animate([
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 340, delay: 260, easing: 'ease-out', fill: 'backwards' });

        lineEl.animate([
            { opacity: 0, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 280, delay: 360, easing: 'ease-out', fill: 'backwards' });
    }

    animateMetrics(potentialSell, unlockedPercent, initialMcap, mcfdvRatio) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const metrics = [
            { id: 'dollarAmount',      end: potentialSell,   isCurrency: true,  suffix: '' },
            { id: 'circulatingPercent',end: unlockedPercent, isCurrency: false, suffix: '%' },
            { id: 'initialMcap',       end: initialMcap,     isCurrency: true,  suffix: '' },
            { id: 'mcfdvRatio',        end: mcfdvRatio,      isCurrency: false, suffix: '%' },
        ];

        metrics.forEach(({ id, end, isCurrency, suffix }, i) => {
            const el = document.getElementById(id);
            if (!el) return;

            const delay = i * 80; // stagger: 0, 80, 160, 240ms

            if (!reduced) {
                // Slide up entrance
                el.animate([
                    { opacity: 0, transform: 'translateY(10px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], {
                    duration: 320,
                    delay,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'backwards'
                });
            }

            // Count up — starts after entrance delay
            setTimeout(() => {
                this.countUp(el, 0, end, 800, isCurrency, suffix);
            }, reduced ? 0 : delay + 60);
        });
    }

    animateRiskBars(dumpRisk, dilutionRisk, liquidityScore) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const bars = [
            { barId: 'dumpRiskBar',    valId: 'dumpRiskValue',    pct: dumpRisk,      delay: 320 },
            { barId: 'dilutionRiskBar',valId: 'dilutionRiskValue',pct: dilutionRisk,  delay: 420 },
            { barId: 'liquidityBar',   valId: 'liquidityValue',   pct: liquidityScore,delay: 520 },
        ];

        bars.forEach(({ barId, valId, pct, delay }) => {
            const bar = document.getElementById(barId);
            const val = document.getElementById(valId);
            if (!bar || !val) return;

            const run = () => {
                val.textContent = `${pct.toFixed(0)}%`;
                if (reduced) {
                    bar.style.width = `${pct}%`;
                    return;
                }
                // Spring-like: overshoot slightly then settle
                bar.animate([
                    { width: '0%',               offset: 0 },
                    { width: `${pct * 1.06}%`,   offset: 0.7 },
                    { width: `${pct * 0.98}%`,   offset: 0.85 },
                    { width: `${pct}%`,          offset: 1 }
                ], {
                    duration: 700,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'forwards'
                });
            };

            reduced ? run() : setTimeout(run, delay);
        });
    }

    // ─── Number counter ───────────────────────────────────────

    countUp(el, start, end, duration, isCurrency = false, suffix = '') {
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // ease-out-quart
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

    // ─── Persistence ──────────────────────────────────────────

    saveCalculation() {
        localStorage.setItem('tge-calc-save', JSON.stringify(this.getFormData()));
        this.showToast('Saved');
    }

    autoSave() {
        localStorage.setItem('tge-calc-autosave', JSON.stringify(this.getFormData()));
    }

    loadSavedData() {
        if (new URLSearchParams(location.search).size) return; // URL params take priority
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
