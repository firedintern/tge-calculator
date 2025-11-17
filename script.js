// TGE Selling Pressure Calculator - Enhanced Version
// Features: Animation, Dark Mode, Comparison, Export, Educational Tooltips, Risk Breakdown

class TGECalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.results = document.getElementById('results');
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedSection = document.getElementById('advancedSection');
        this.savedCalculations = this.loadComparisons();

        this.init();
        this.loadFromURL();
        this.loadSavedData();
        this.initDarkMode();
    }

    init() {
        // Event listeners
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.calculatePressure();
            }
        });

        this.advancedToggle.addEventListener('click', () => {
            this.toggleAdvanced();
        });

        // Real-time validation
        const inputs = this.form.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });

        // Breakdown validation
        const breakdownInputs = ['airdrop', 'publicSale', 'liquidity', 'team', 'other'];
        breakdownInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.validateBreakdown());
            }
        });

        // Action buttons
        document.getElementById('saveBtn').addEventListener('click', () => this.saveCalculation());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareCalculation());
        document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPNG());
        document.getElementById('compareBtn').addEventListener('click', () => this.addToComparison());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleDarkMode());

        // Mobile-friendly tooltips (click to show/hide on touch devices)
        this.initMobileTooltips();

        // Chart responsiveness - redraw on window resize
        this.initChartResize();
    }

    initChartResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Redraw chart if it's visible
                const chartContainer = document.getElementById('chartContainer');
                if (chartContainer && chartContainer.style.display !== 'none') {
                    const formData = this.getFormData();
                    if (formData) {
                        this.createUnlockChart(
                            formData.airdrop,
                            formData.publicSale,
                            formData.liquidity,
                            formData.team,
                            formData.other,
                            formData.unlockedPercent
                        );
                    }
                }
            }, 250); // Debounce 250ms
        });
    }

    initMobileTooltips() {
        const tooltips = document.querySelectorAll('.tooltip-icon, .educational-tooltip');

        tooltips.forEach(tooltip => {
            // Add click handler for mobile
            tooltip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Toggle active class for mobile display
                tooltip.classList.toggle('tooltip-active');

                // Remove active class from other tooltips
                tooltips.forEach(other => {
                    if (other !== tooltip) {
                        other.classList.remove('tooltip-active');
                    }
                });
            });
        });

        // Close tooltips when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tooltip-icon') &&
                !e.target.classList.contains('educational-tooltip')) {
                tooltips.forEach(tooltip => {
                    tooltip.classList.remove('tooltip-active');
                });
            }
        });
    }

    // Dark Mode
    initDarkMode() {
        const savedTheme = localStorage.getItem('tge-calculator-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').textContent = '☀️';
        }
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('tge-calculator-theme', isDark ? 'dark' : 'light');
    }

    toggleAdvanced() {
        this.advancedSection.classList.toggle('show');
        if (this.advancedSection.classList.contains('show')) {
            this.advancedToggle.textContent = '- Hide advanced options';
            this.advancedToggle.setAttribute('aria-expanded', 'true');
        } else {
            this.advancedToggle.textContent = '+ Advanced: Add breakdown by category (Recommended for accurate rating)';
            this.advancedToggle.setAttribute('aria-expanded', 'false');
        }
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const errorEl = input.parentElement.querySelector('.input-error');
        let isValid = true;
        let errorMsg = '';

        if (input.required && (!input.value || isNaN(value))) {
            isValid = false;
            errorMsg = 'This field is required';
        } else if (value < 0) {
            isValid = false;
            errorMsg = 'Value cannot be negative';
        } else if (input.id.includes('Percent') || ['airdrop', 'publicSale', 'liquidity', 'team', 'other'].includes(input.id)) {
            if (value > 100) {
                isValid = false;
                errorMsg = 'Percentage cannot exceed 100%';
            }
        } else if (input.id === 'fdv' && value > 1000000000000) {
            isValid = false;
            errorMsg = 'FDV seems unreasonably high';
        } else if (input.id === 'totalSupply' && value > 1000000000000000) {
            isValid = false;
            errorMsg = 'Supply seems unreasonably high';
        }

        if (!isValid) {
            input.classList.add('error');
            if (errorEl) {
                errorEl.textContent = errorMsg;
                errorEl.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            if (errorEl) {
                errorEl.classList.remove('show');
            }
        }

        return isValid;
    }

    validateForm() {
        const inputs = this.form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateBreakdown() {
        const airdrop = parseFloat(document.getElementById('airdrop').value) || 0;
        const publicSale = parseFloat(document.getElementById('publicSale').value) || 0;
        const liquidity = parseFloat(document.getElementById('liquidity').value) || 0;
        const team = parseFloat(document.getElementById('team').value) || 0;
        const other = parseFloat(document.getElementById('other').value) || 0;
        const unlockedPercent = parseFloat(document.getElementById('unlockedPercent').value) || 0;

        const totalBreakdown = airdrop + publicSale + liquidity + team + other;
        const breakdownWarning = document.getElementById('breakdownWarning');

        if (totalBreakdown > 0 && Math.abs(totalBreakdown - unlockedPercent) > 1) {
            breakdownWarning.classList.add('show');
            breakdownWarning.textContent = `⚠️ Total breakdown (${totalBreakdown.toFixed(1)}%) doesn't match % Unlocked at TGE (${unlockedPercent.toFixed(1)}%)`;
            return false;
        } else {
            breakdownWarning.classList.remove('show');
            return true;
        }
    }

    calculatePressure() {
        const totalSupply = parseFloat(document.getElementById('totalSupply').value);
        const fdv = parseFloat(document.getElementById('fdv').value);
        const unlockedPercent = parseFloat(document.getElementById('unlockedPercent').value);
        const projectName = document.getElementById('projectName').value || 'Unknown Project';
        const expectedPrice = parseFloat(document.getElementById('expectedPrice').value) || 0;

        // Get breakdown if provided
        const airdrop = parseFloat(document.getElementById('airdrop').value) || 0;
        const publicSale = parseFloat(document.getElementById('publicSale').value) || 0;
        const liquidity = parseFloat(document.getElementById('liquidity').value) || 0;
        const team = parseFloat(document.getElementById('team').value) || 0;
        const other = parseFloat(document.getElementById('other').value) || 0;

        const totalBreakdown = airdrop + publicSale + liquidity + team + other;
        const hasBreakdown = totalBreakdown > 0;

        // Calculate weighted selling pressure
        let effectiveSellingPressure;
        if (hasBreakdown) {
            effectiveSellingPressure = (airdrop * 1.0) + (publicSale * 1.0) + (team * 0.3) + (liquidity * 0) + (other * 0.2);
        } else {
            effectiveSellingPressure = unlockedPercent * 0.8;
        }

        // Calculate metrics
        const unlockedTokens = (unlockedPercent / 100) * totalSupply;
        const potentialSellValue = (effectiveSellingPressure / 100) * fdv;
        const initialMcap = (unlockedPercent / 100) * fdv;
        const mcfdvRatio = unlockedPercent;

        // Calculate risk dimensions
        const dumpRisk = Math.min(effectiveSellingPressure * 2, 100); // High if lots of airdrop/public
        const dilutionRisk = Math.max(0, 100 - unlockedPercent); // High if low unlock %
        const liquidityScore = liquidity * 2; // Higher liquidity = better

        // Determine pressure rating
        let rating, ratingClass, description;

        if (effectiveSellingPressure > 40 || unlockedPercent > 60) {
            rating = 'HIGH';
            ratingClass = 'score-high';
            if (effectiveSellingPressure > 40) {
                description = '🚨 Very high selling pressure expected. Large portion will be dumped immediately at TGE.';
            } else {
                description = '🚨 High unlock percentage creates significant inflation risk as most supply is already circulating.';
            }
        } else if (effectiveSellingPressure >= 20 || unlockedPercent >= 30) {
            rating = 'MEDIUM';
            ratingClass = 'score-medium';
            description = '⚡ Moderate selling pressure. Monitor initial trading carefully and watch for dips.';
        } else {
            rating = 'LOW';
            ratingClass = 'score-low';
            description = '✅ Low immediate selling pressure. Most tokens remain locked with healthy vesting schedule.';
        }

        // Add breakdown insights
        if (hasBreakdown) {
            const highPressurePercent = airdrop + publicSale;
            if (highPressurePercent > 25) {
                description += ` Airdrops and public sales (${highPressurePercent.toFixed(1)}%) will create significant immediate sell pressure.`;
            }
            if (team > 0) {
                description += ` ⚠️ Team tokens unlocked at TGE is a red flag - shows lack of long-term commitment.`;
            }
            if (liquidity > 50) {
                description += ` ✅ Good liquidity allocation (${liquidity.toFixed(1)}%) helps absorb selling pressure.`;
            }
        }

        // Special case: Low float, high FDV warning
        if (unlockedPercent < 10 && fdv > 100000000) {
            description += ' ⚠️ Very low float with high FDV - be cautious of future dilution when tokens unlock.';
        }

        // Update UI with animation
        document.getElementById('scoreBadge').textContent = rating;
        document.getElementById('scoreBadge').className = `score-badge ${ratingClass}`;
        document.getElementById('scoreBadge').setAttribute('aria-label', `Selling pressure rating: ${rating}`);
        document.getElementById('scoreDescription').textContent = description;

        // Animate numbers
        this.animateValue('dollarAmount', 0, potentialSellValue, 1000, true);
        this.animateValue('circulatingPercent', 0, unlockedPercent, 1000, false, '%');
        this.animateValue('initialMcap', 0, initialMcap, 1000, true);
        this.animateValue('mcfdvRatio', 0, mcfdvRatio, 1000, false, '%');

        // Update risk breakdown
        this.updateRiskBreakdown(dumpRisk, dilutionRisk, liquidityScore);

        // Show effective pressure if breakdown was used
        const oldNote = document.querySelector('.effective-pressure-note');
        if (oldNote) oldNote.remove();

        if (hasBreakdown && effectiveSellingPressure !== unlockedPercent) {
            const effectiveNote = document.createElement('div');
            effectiveNote.className = 'effective-pressure-note';
            effectiveNote.innerHTML = `<strong>Weighted Selling Pressure: ${effectiveSellingPressure.toFixed(1)}%</strong><br>Based on category breakdown (Airdrop/Public Sale 100%, Team 30%, Other 20%, Liquidity excluded)`;
            this.results.appendChild(effectiveNote);
        }

        // Add historical price context
        if (expectedPrice > 0) {
            const priceNote = document.createElement('div');
            priceNote.className = 'effective-pressure-note';
            const tokensToSell = (effectiveSellingPressure / 100) * totalSupply;
            const sellValue = tokensToSell * expectedPrice;
            priceNote.innerHTML = `<strong>Price Context at $${expectedPrice.toFixed(4)}/token:</strong><br>
                ~${this.formatLargeNumber(tokensToSell)} tokens likely to be sold<br>
                Worth approximately ${this.formatCurrency(sellValue)}`;
            this.results.appendChild(priceNote);
        }

        // Create unlock schedule chart
        this.createUnlockChart(airdrop, publicSale, liquidity, team, other, unlockedPercent);

        // Show results and action buttons
        this.results.classList.add('show');
        document.getElementById('actionButtons').classList.add('show');

        // Scroll to results
        this.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Auto-save
        this.autoSave();
    }

    // Animated number counting
    animateValue(elementId, start, end, duration, isCurrency = false, suffix = '') {
        const element = document.getElementById(elementId);
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        element.classList.add('animating');

        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                if (isCurrency) {
                    element.textContent = this.formatCurrency(end);
                } else {
                    element.textContent = end.toFixed(2) + suffix;
                }
                clearInterval(timer);
                setTimeout(() => element.classList.remove('animating'), 500);
            } else {
                if (isCurrency) {
                    element.textContent = this.formatCurrency(current);
                } else {
                    element.textContent = current.toFixed(2) + suffix;
                }
            }
        }, 16);
    }

    // Risk breakdown bars
    updateRiskBreakdown(dumpRisk, dilutionRisk, liquidityScore) {
        const container = document.getElementById('riskBreakdown');

        // Reset bars width with animation delay
        setTimeout(() => {
            document.getElementById('dumpRiskBar').style.width = `${dumpRisk}%`;
            document.getElementById('dilutionRiskBar').style.width = `${dilutionRisk}%`;
            document.getElementById('liquidityBar').style.width = `${Math.min(liquidityScore, 100)}%`;

            document.getElementById('dumpRiskValue').textContent = `${dumpRisk.toFixed(0)}%`;
            document.getElementById('dilutionRiskValue').textContent = `${dilutionRisk.toFixed(0)}%`;
            document.getElementById('liquidityValue').textContent = `${Math.min(liquidityScore, 100).toFixed(0)}%`;
        }, 100);
    }

    createUnlockChart(airdrop, publicSale, liquidity, team, other, unlockedPercent) {
        const chartContainer = document.getElementById('chartContainer');
        const canvas = document.getElementById('unlockChart');

        if (airdrop + publicSale + liquidity + team + other === 0) {
            chartContainer.style.display = 'none';
            return;
        }

        chartContainer.style.display = 'block';

        // Wait for layout to settle
        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            const containerWidth = chartContainer.offsetWidth || 500;
            const width = canvas.width = containerWidth * 2;
            const height = canvas.height = 400;

            ctx.clearRect(0, 0, width, height);

            const categories = [
                { name: 'Airdrop', value: airdrop, color: '#fc8181' },
                { name: 'Public Sale', value: publicSale, color: '#f6ad55' },
                { name: 'Team', value: team, color: '#f6e05e' },
                { name: 'Other', value: other, color: '#90cdf4' },
                { name: 'Liquidity', value: liquidity, color: '#68d391' }
            ].filter(cat => cat.value > 0);

            const barWidth = width / (categories.length * 2);
            const maxValue = Math.max(...categories.map(c => c.value), unlockedPercent);
            const scale = (height - 80) / maxValue;

            const isDarkMode = document.body.classList.contains('dark-mode');
            const textColor = isDarkMode ? '#ffffff' : '#2d3748';

            categories.forEach((cat, i) => {
                const x = (i * 2 + 0.5) * barWidth;
                const barHeight = cat.value * scale;
                const y = height - barHeight - 40;

                ctx.fillStyle = cat.color;
                ctx.fillRect(x, y, barWidth, barHeight);

                ctx.fillStyle = textColor;
                ctx.font = 'bold 20px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(cat.name, x + barWidth / 2, height - 15);

                ctx.fillStyle = textColor;
                ctx.font = 'bold 24px -apple-system, sans-serif';
                ctx.fillText(`${cat.value.toFixed(1)}%`, x + barWidth / 2, y - 10);
            });
        }, 100);
    }

    formatCurrency(value) {
        if (value >= 1000000000) {
            return '$' + (value / 1000000000).toFixed(2) + 'B';
        } else if (value >= 1000000) {
            return '$' + (value / 1000000).toFixed(2) + 'M';
        } else if (value >= 1000) {
            return '$' + (value / 1000).toFixed(2) + 'K';
        }
        return '$' + value.toFixed(2);
    }

    formatLargeNumber(value) {
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(2) + 'B';
        } else if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        }
        return value.toFixed(0);
    }

    // Save/Share/Export functions
    saveCalculation() {
        const data = this.getFormData();
        localStorage.setItem('tge-calculator-data', JSON.stringify(data));
        this.showToast('✅ Calculation saved!');
    }

    autoSave() {
        const data = this.getFormData();
        localStorage.setItem('tge-calculator-autosave', JSON.stringify(data));
    }

    loadSavedData() {
        const saved = localStorage.getItem('tge-calculator-autosave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.populateForm(data);
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    }

    shareCalculation() {
        const data = this.getFormData();
        const params = new URLSearchParams();

        Object.keys(data).forEach(key => {
            if (data[key]) {
                params.append(key, data[key]);
            }
        });

        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

        navigator.clipboard.writeText(url).then(() => {
            this.showToast('📋 Link copied to clipboard!');
        }).catch(() => {
            prompt('Share this URL:', url);
        });
    }

    shareOnX() {
        const projectName = document.getElementById('projectName').value || 'this project';
        const rating = document.getElementById('scoreBadge').textContent;
        const dollarAmount = document.getElementById('dollarAmount').textContent;

        const tweetText = `Just analyzed ${projectName}'s TGE selling pressure using the TGE Calculator!\n\n` +
            `Pressure Rating: ${rating}\n` +
            `Potential Sell Pressure: ${dollarAmount}\n\n` +
            `Check your project's tokenomics: ${window.location.href}`;

        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    }

    async exportToPNG() {
        // For this feature to work, we'd need html2canvas library
        // For now, show a message that it requires the library
        this.showToast('📸 Export feature requires html2canvas library. Opening print dialog...');
        setTimeout(() => {
            window.print();
        }, 1000);
    }

    // Comparison mode
    addToComparison() {
        const data = this.getFormData();
        const calculation = {
            ...data,
            timestamp: Date.now(),
            rating: document.getElementById('scoreBadge').textContent,
            dollarAmount: document.getElementById('dollarAmount').textContent
        };

        this.savedCalculations.push(calculation);
        if (this.savedCalculations.length > 3) {
            this.savedCalculations.shift(); // Keep only last 3
        }

        localStorage.setItem('tge-calculator-comparisons', JSON.stringify(this.savedCalculations));
        this.renderComparisons();
        this.showToast('➕ Added to comparison!');
    }

    loadComparisons() {
        const saved = localStorage.getItem('tge-calculator-comparisons');
        return saved ? JSON.parse(saved) : [];
    }

    renderComparisons() {
        const container = document.getElementById('comparisonContainer');
        const grid = document.getElementById('comparisonGrid');

        if (this.savedCalculations.length === 0) {
            container.classList.remove('show');
            return;
        }

        container.classList.add('show');
        grid.innerHTML = '';

        this.savedCalculations.forEach((calc, index) => {
            const card = document.createElement('div');
            card.className = 'comparison-card';
            card.innerHTML = `
                <button class="comparison-remove" onclick="calculator.removeComparison(${index})">×</button>
                <div class="comparison-card-title">${calc.projectName || 'Project ' + (index + 1)}</div>
                <div class="comparison-metric">
                    <span class="comparison-metric-label">Rating:</span>
                    <span class="comparison-metric-value">${calc.rating}</span>
                </div>
                <div class="comparison-metric">
                    <span class="comparison-metric-label">Sell Pressure:</span>
                    <span class="comparison-metric-value">${calc.dollarAmount}</span>
                </div>
                <div class="comparison-metric">
                    <span class="comparison-metric-label">Unlocked:</span>
                    <span class="comparison-metric-value">${calc.unlockedPercent}%</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    removeComparison(index) {
        this.savedCalculations.splice(index, 1);
        localStorage.setItem('tge-calculator-comparisons', JSON.stringify(this.savedCalculations));
        this.renderComparisons();
        this.showToast('🗑️ Removed from comparison');
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const data = {};

        params.forEach((value, key) => {
            data[key] = value;
        });

        if (Object.keys(data).length > 0) {
            this.populateForm(data);
            if (data.totalSupply && data.fdv && data.unlockedPercent) {
                setTimeout(() => {
                    if (this.validateForm()) {
                        this.calculatePressure();
                    }
                }, 100);
            }
        }
    }

    getFormData() {
        return {
            projectName: document.getElementById('projectName').value,
            totalSupply: document.getElementById('totalSupply').value,
            fdv: document.getElementById('fdv').value,
            unlockedPercent: document.getElementById('unlockedPercent').value,
            expectedPrice: document.getElementById('expectedPrice').value,
            airdrop: document.getElementById('airdrop').value,
            publicSale: document.getElementById('publicSale').value,
            liquidity: document.getElementById('liquidity').value,
            team: document.getElementById('team').value,
            other: document.getElementById('other').value
        };
    }

    populateForm(data) {
        Object.keys(data).forEach(key => {
            const input = document.getElementById(key);
            if (input && data[key]) {
                input.value = data[key];
            }
        });

        if (data.airdrop || data.publicSale || data.liquidity || data.team || data.other) {
            if (!this.advancedSection.classList.contains('show')) {
                this.toggleAdvanced();
            }
        }
    }

    clearForm() {
        if (confirm('Clear all fields and results?')) {
            this.form.reset();
            this.results.classList.remove('show');
            document.getElementById('actionButtons').classList.remove('show');
            localStorage.removeItem('tge-calculator-autosave');

            const inputs = this.form.querySelectorAll('input');
            inputs.forEach(input => {
                input.classList.remove('error');
                const errorEl = input.parentElement.querySelector('.input-error');
                if (errorEl) {
                    errorEl.classList.remove('show');
                }
            });

            this.showToast('🗑️ Form cleared');
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize calculator when DOM is ready
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new TGECalculator();
});
