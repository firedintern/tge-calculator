// TGE Selling Pressure Calculator
// Enhanced with validation, accessibility, save/share features, and chart visualization

class TGECalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.results = document.getElementById('results');
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedSection = document.getElementById('advancedSection');

        this.init();
        this.loadFromURL();
        this.loadSavedData();
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
            document.getElementById(id).addEventListener('input', () => {
                this.validateBreakdown();
            });
        });

        // Save/Share buttons
        document.getElementById('saveBtn').addEventListener('click', () => this.saveCalculation());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareCalculation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
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

        // Check if empty (for required fields)
        if (input.required && (!input.value || isNaN(value))) {
            isValid = false;
            errorMsg = 'This field is required';
        }
        // Check for negative values
        else if (value < 0) {
            isValid = false;
            errorMsg = 'Value cannot be negative';
        }
        // Check percentage ranges
        else if (input.id.includes('Percent') || ['airdrop', 'publicSale', 'liquidity', 'team', 'other'].includes(input.id)) {
            if (value > 100) {
                isValid = false;
                errorMsg = 'Percentage cannot exceed 100%';
            }
        }
        // Check reasonable FDV max (1 trillion)
        else if (input.id === 'fdv' && value > 1000000000000) {
            isValid = false;
            errorMsg = 'FDV seems unreasonably high';
        }
        // Check reasonable supply max (1 quadrillion)
        else if (input.id === 'totalSupply' && value > 1000000000000000) {
            isValid = false;
            errorMsg = 'Supply seems unreasonably high';
        }

        // Update UI
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

        // Show warning if breakdown doesn't match (with 1% tolerance)
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
        const projectName = document.getElementById('projectName').value;

        // Get breakdown if provided
        const airdrop = parseFloat(document.getElementById('airdrop').value) || 0;
        const publicSale = parseFloat(document.getElementById('publicSale').value) || 0;
        const liquidity = parseFloat(document.getElementById('liquidity').value) || 0;
        const team = parseFloat(document.getElementById('team').value) || 0;
        const other = parseFloat(document.getElementById('other').value) || 0;

        const totalBreakdown = airdrop + publicSale + liquidity + team + other;
        const hasBreakdown = totalBreakdown > 0;

        // Calculate weighted selling pressure if breakdown provided
        let effectiveSellingPressure;
        if (hasBreakdown) {
            // Weights: Airdrop 1.0, Public 1.0, Team 0.3, Liquidity 0, Other 0.2
            effectiveSellingPressure = (airdrop * 1.0) + (publicSale * 1.0) + (team * 0.3) + (liquidity * 0) + (other * 0.2);
        } else {
            // If no breakdown, assume 80% will sell (moderate assumption)
            effectiveSellingPressure = unlockedPercent * 0.8;
        }

        // Calculate metrics
        const unlockedTokens = (unlockedPercent / 100) * totalSupply;
        const potentialSellValue = (effectiveSellingPressure / 100) * fdv;
        const initialMcap = (unlockedPercent / 100) * fdv;
        const mcfdvRatio = unlockedPercent;

        // Determine pressure rating with improved logic
        let rating, ratingClass, description;

        // HIGH: Effective pressure > 40% OR (unlock > 60% which means low MC/FDV ratio)
        if (effectiveSellingPressure > 40 || unlockedPercent > 60) {
            rating = 'HIGH';
            ratingClass = 'score-high';
            if (effectiveSellingPressure > 40) {
                description = '🚨 Very high selling pressure expected. Large portion will be dumped immediately at TGE.';
            } else {
                description = '🚨 High unlock percentage creates significant inflation risk as most supply is already circulating.';
            }
        }
        // MEDIUM: Effective pressure 20-40% OR unlock 30-60%
        else if (effectiveSellingPressure >= 20 || unlockedPercent >= 30) {
            rating = 'MEDIUM';
            ratingClass = 'score-medium';
            description = '⚡ Moderate selling pressure. Monitor initial trading carefully and watch for dips.';
        }
        // LOW: Effective pressure < 20% AND unlock < 30%
        else {
            rating = 'LOW';
            ratingClass = 'score-low';
            description = '✅ Low immediate selling pressure. Most tokens remain locked with healthy vesting schedule.';
        }

        // Add breakdown insights if provided
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

        // Update UI
        document.getElementById('scoreBadge').textContent = rating;
        document.getElementById('scoreBadge').className = `score-badge ${ratingClass}`;
        document.getElementById('scoreBadge').setAttribute('aria-label', `Selling pressure rating: ${rating}`);
        document.getElementById('scoreDescription').textContent = description;

        document.getElementById('dollarAmount').textContent = this.formatCurrency(potentialSellValue);
        document.getElementById('circulatingPercent').textContent = unlockedPercent.toFixed(2) + '%';
        document.getElementById('initialMcap').textContent = this.formatCurrency(initialMcap);
        document.getElementById('mcfdvRatio').textContent = mcfdvRatio.toFixed(2) + '%';

        // Show effective pressure if breakdown was used
        const oldNote = document.querySelector('.effective-pressure-note');
        if (oldNote) oldNote.remove();

        if (hasBreakdown && effectiveSellingPressure !== unlockedPercent) {
            const effectiveNote = document.createElement('div');
            effectiveNote.className = 'effective-pressure-note';
            effectiveNote.innerHTML = `<strong>Weighted Selling Pressure: ${effectiveSellingPressure.toFixed(1)}%</strong><br>Based on category breakdown (Airdrop/Public Sale 100%, Team 30%, Other 20%, Liquidity excluded)`;
            this.results.appendChild(effectiveNote);
        }

        // Create unlock schedule chart
        this.createUnlockChart(airdrop, publicSale, liquidity, team, other, unlockedPercent);

        // Show results and action buttons
        this.results.classList.add('show');
        document.getElementById('actionButtons').classList.add('show');

        // Scroll to results
        this.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Auto-save to localStorage
        this.autoSave();
    }

    createUnlockChart(airdrop, publicSale, liquidity, team, other, unlockedPercent) {
        const chartContainer = document.getElementById('chartContainer');
        const canvas = document.getElementById('unlockChart');

        // Only show chart if we have breakdown data
        if (airdrop + publicSale + liquidity + team + other === 0) {
            chartContainer.style.display = 'none';
            return;
        }

        chartContainer.style.display = 'block';

        // Simple bar chart visualization
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2; // 2x for retina
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

        categories.forEach((cat, i) => {
            const x = (i * 2 + 0.5) * barWidth;
            const barHeight = cat.value * scale;
            const y = height - barHeight - 40;

            // Draw bar
            ctx.fillStyle = cat.color;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw label
            ctx.fillStyle = '#2d3748';
            ctx.font = 'bold 20px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cat.name, x + barWidth / 2, height - 15);

            // Draw value
            ctx.fillStyle = '#2d3748';
            ctx.font = 'bold 24px -apple-system, sans-serif';
            ctx.fillText(`${cat.value.toFixed(1)}%`, x + barWidth / 2, y - 10);
        });
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

        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('📋 Link copied to clipboard!');
        }).catch(() => {
            // Fallback: show URL in alert
            prompt('Share this URL:', url);
        });
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const data = {};

        params.forEach((value, key) => {
            data[key] = value;
        });

        if (Object.keys(data).length > 0) {
            this.populateForm(data);
            // Auto-calculate if we have required fields
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

        // Open advanced section if breakdown data exists
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

            // Clear all error states
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
document.addEventListener('DOMContentLoaded', () => {
    new TGECalculator();
});
