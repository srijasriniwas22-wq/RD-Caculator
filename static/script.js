document.addEventListener("DOMContentLoaded", () => {
    const depositInput = document.getElementById("deposit-amount");
    const depositSlider = document.getElementById("deposit-slider");
    const tenureSelect = document.getElementById("tenure-months");
    const rateInput = document.getElementById("interest-rate");
    const rateSlider = document.getElementById("rate-slider");
    const rateError = document.getElementById("rate-error");
    const compoundingSelect = document.getElementById("compounding");
    const resetBtn = document.getElementById("reset-btn");
    const toggleScheduleBtn = document.getElementById("toggle-schedule-btn");
    const scheduleContainer = document.getElementById("schedule-table-container");

    const maturityValueEl = document.getElementById("maturity-value");
    const summarySubtitleEl = document.getElementById("summary-subtitle");
    const totalDepositedEl = document.getElementById("total-deposited");
    const totalInterestEl = document.getElementById("total-interest");
    const donutArcEl = document.getElementById("donut-interest-arc");
    const interestPercentLabel = document.getElementById("interest-percent-label");
    const principalRatioEl = document.getElementById("principal-ratio");
    const interestRatioEl = document.getElementById("interest-ratio");
    const scheduleTbody = document.getElementById("schedule-tbody");

    function formatINR(num) {
        return "₹ " + Math.round(num).toLocaleString("en-IN");
    }

    function animateValue(el) {
        el.classList.remove("number-pop");
        void el.offsetWidth;
        el.classList.add("number-pop");
    }

    let debounceTimer = null;

    async function fetchPythonCalculation() {
        let monthlyDeposit = parseFloat(depositInput.value);
        if (isNaN(monthlyDeposit) || monthlyDeposit < 0) {
            monthlyDeposit = 0;
        }

        const months = parseInt(tenureSelect.value, 10) || 1;
        let annualRate = parseFloat(rateInput.value);

        if (isNaN(annualRate)) {
            annualRate = 7.0;
        }
        if (annualRate < 7) {
            rateError.textContent = "Min 7%";
            annualRate = 7;
        } else if (annualRate > 20) {
            rateError.textContent = "Max 20%";
            annualRate = 20;
        } else {
            rateError.textContent = "";
        }

        const compoundingFreq = parseInt(compoundingSelect.value, 10) || 4;

        try {
            const response = await fetch("/api/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monthly_deposit: monthlyDeposit,
                    months: months,
                    annual_rate: annualRate,
                    compounding_freq: compoundingFreq
                })
            });

            if (!response.ok) return;
            const data = await response.json();

            maturityValueEl.textContent = formatINR(data.maturity_value);
            animateValue(maturityValueEl);

            summarySubtitleEl.textContent = `${data.annual_rate.toFixed(1)}% • ${data.months} ${data.months === 1 ? "Month" : "Months"}`;
            totalDepositedEl.textContent = formatINR(data.total_principal);
            totalInterestEl.textContent = formatINR(data.total_interest);

            donutArcEl.setAttribute("stroke-dasharray", `${data.interest_share}, 100`);
            interestPercentLabel.textContent = `${data.interest_share}%`;
            principalRatioEl.textContent = `${data.principal_share}%`;
            interestRatioEl.textContent = `${data.interest_share}%`;

            scheduleTbody.innerHTML = data.schedule.map(row => `
                <tr>
                    <td><strong>${row.month}</strong></td>
                    <td>${formatINR(row.monthly_deposit)}</td>
                    <td>${formatINR(row.cumulative_principal)}</td>
                    <td class="highlight-blue">+ ${formatINR(row.interest_accrued)}</td>
                    <td><strong>${formatINR(row.closing_balance)}</strong></td>
                </tr>
            `).join("");
        } catch (err) {
            console.error(err);
        }
    }

    function scheduleUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchPythonCalculation, 60);
    }

    depositInput.addEventListener("input", () => {
        const val = parseFloat(depositInput.value) || 0;
        if (val <= 100000) depositSlider.value = val;
        scheduleUpdate();
    });

    depositSlider.addEventListener("input", () => {
        depositInput.value = depositSlider.value;
        scheduleUpdate();
    });

    tenureSelect.addEventListener("change", fetchPythonCalculation);
    compoundingSelect.addEventListener("change", fetchPythonCalculation);

    rateInput.addEventListener("input", () => {
        const val = parseFloat(rateInput.value);
        if (!isNaN(val) && val >= 7 && val <= 20) {
            rateSlider.value = val;
        }
        scheduleUpdate();
    });

    rateInput.addEventListener("blur", () => {
        let val = parseFloat(rateInput.value);
        if (isNaN(val) || val < 7) val = 7;
        if (val > 20) val = 20;
        rateInput.value = val;
        rateSlider.value = val;
        fetchPythonCalculation();
    });

    rateSlider.addEventListener("input", () => {
        rateInput.value = rateSlider.value;
        scheduleUpdate();
    });

    // Reset strictly back to ZERO
    resetBtn.addEventListener("click", () => {
        depositInput.value = 0;
        depositSlider.value = 0;
        tenureSelect.value = 1;
        rateInput.value = 7.0;
        rateSlider.value = 7.0;
        compoundingSelect.value = 4;
        rateError.textContent = "";
        fetchPythonCalculation();
    });

    toggleScheduleBtn.addEventListener("click", () => {
        if (scheduleContainer.style.display === "none") {
            scheduleContainer.style.display = "block";
            toggleScheduleBtn.textContent = "Hide";
        } else {
            scheduleContainer.style.display = "none";
            toggleScheduleBtn.textContent = "Show";
        }
    });
});
