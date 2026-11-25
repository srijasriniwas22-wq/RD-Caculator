from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from datetime import datetime

app = Flask(__name__)
app.secret_key = "bluevault_rd_secret_key"


def calculate_rd_details(monthly_deposit: float, months: int, annual_rate: float, compounding_freq: int = 4):
    monthly_deposit = max(0.0, float(monthly_deposit))
    months = max(1, min(120, int(months)))
    annual_rate = max(7.0, min(20.0, float(annual_rate)))
    compounding_freq = int(compounding_freq) if int(compounding_freq) in [1, 2, 4, 12] else 4

    r = annual_rate / 100.0
    schedule = []

    for m in range(1, months + 1):
        balance_at_m = 0.0
        for k in range(1, m + 1):
            remaining_months = m - k + 1
            time_in_years = remaining_months / 12.0
            balance_at_m += monthly_deposit * ((1.0 + r / compounding_freq) ** (compounding_freq * time_in_years))

        cum_principal = monthly_deposit * m
        cum_interest = max(0.0, balance_at_m - cum_principal)

        schedule.append({
            "month": m,
            "monthly_deposit": round(monthly_deposit),
            "cumulative_principal": round(cum_principal),
            "interest_accrued": round(cum_interest),
            "closing_balance": round(balance_at_m),
        })

    final_entry = schedule[-1] if schedule else {
        "cumulative_principal": 0,
        "interest_accrued": 0,
        "closing_balance": 0,
    }

    maturity_value = final_entry["closing_balance"]
    total_principal = final_entry["cumulative_principal"]
    total_interest = final_entry["interest_accrued"]

    interest_share = round((total_interest / maturity_value) * 100, 1) if maturity_value > 0 else 0.0
    principal_share = round(100.0 - interest_share, 1) if maturity_value > 0 else 0.0

    return {
        "monthly_deposit": round(monthly_deposit),
        "months": months,
        "annual_rate": round(annual_rate, 1),
        "compounding_freq": compounding_freq,
        "maturity_value": maturity_value,
        "total_principal": total_principal,
        "total_interest": total_interest,
        "interest_share": interest_share,
        "principal_share": principal_share,
        "schedule": schedule,
    }


@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        if username and password:
            session["user"] = username
            return redirect(url_for("calculator"))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


@app.route("/calculator")
def calculator():
    if "user" not in session:
        return redirect(url_for("login"))

    # Initial state set strictly to ZERO (0 deposit, 1 month, 7.0% min rate)
    initial_data = calculate_rd_details(monthly_deposit=0, months=1, annual_rate=7.0, compounding_freq=4)
    generated_date = datetime.now().strftime("%d %B %Y, %I:%M %p")
    return render_template(
        "calculator.html",
        data=initial_data,
        months_list=list(range(1, 121)),
        generated_date=generated_date,
    )


@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    payload = request.get_json(silent=True) or {}
    try:
        monthly_deposit = float(payload.get("monthly_deposit", 0))
    except (ValueError, TypeError):
        monthly_deposit = 0.0

    try:
        months = int(payload.get("months", 1))
    except (ValueError, TypeError):
        months = 1

    try:
        annual_rate = float(payload.get("annual_rate", 7.0))
    except (ValueError, TypeError):
        annual_rate = 7.0

    try:
        compounding_freq = int(payload.get("compounding_freq", 4))
    except (ValueError, TypeError):
        compounding_freq = 4

    result = calculate_rd_details(monthly_deposit, months, annual_rate, compounding_freq)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
