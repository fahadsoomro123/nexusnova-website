#!/usr/bin/env python3
"""Final deterministic SEO, article-discovery and GitHub Actions cleanup.

This deliberately touches public HTML metadata, public search discovery, sitemap
entries and workflow action references only. Protected business/runtime engines
are not modified.
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://nexusnovatools.com/"
BRAND = " | NexusNova Tools"
ARTICLE_DIR = ROOT / "articles"

TITLE_OVERRIDES = {
    "50-30-20-budget-rule.html": "50/30/20 Budget Rule Explained | NexusNova Tools",
    "air-conditioner-running-cost.html": "Air Conditioner Running Cost Calculator | NexusNova Tools",
    "apr-vs-apy.html": "APR vs APY: Interest Rates Explained | NexusNova Tools",
    "bandwidth-vs-latency.html": "Bandwidth vs Latency: Key Differences | NexusNova Tools",
    "battery-runtime-estimator.html": "Battery Runtime Estimator: Backup Time | NexusNova Tools",
    "bond-yield-duration-risk.html": "Bond Yield vs Duration Risk | NexusNova Tools",
    "cagr-vs-average-return.html": "CAGR vs Average Return: Growth Explained | NexusNova Tools",
    "cash-flow-forecast-small-business.html": "Small-Business Cash Flow Forecast | NexusNova Tools",
    "cloud-storage-cost-growth.html": "Cloud Storage Cost Growth Forecast | NexusNova Tools",
    "credit-utilization-explained.html": "Credit Utilization: Credit Score Impact | NexusNova Tools",
    "currency-conversion-fees.html": "Currency Conversion Fees: Compare Costs | NexusNova Tools",
    "debt-avalanche-vs-snowball.html": "Debt Avalanche vs Snowball Payoff | NexusNova Tools",
    "dividend-yield-vs-total-return.html": "Dividend Yield vs Total Return | NexusNova Tools",
    "education-savings-time-value.html": "Education Savings: Time Value of Money | NexusNova Tools",
    "electricity-appliance-kwh-cost.html": "Appliance Electricity Cost: kWh and Bills | NexusNova Tools",
    "emergency-fund-size-guide.html": "Emergency Fund Size: How Much to Save | NexusNova Tools",
    "freelancer-hourly-rate.html": "Freelancer Hourly Rate: Price Your Work | NexusNova Tools",
    "fuel-cost-per-trip.html": "Fuel Cost per Trip Calculator | NexusNova Tools",
    "home-insulation-payback.html": "Home Insulation Payback: Energy Savings | NexusNova Tools",
    "inflation-purchasing-power.html": "Inflation and Purchasing Power Explained | NexusNova Tools",
    "insurance-deductible-tradeoff.html": "Insurance Deductible: Cost vs Risk | NexusNova Tools",
    "international-transfer-fees.html": "International Transfer Fees: Compare Costs | NexusNova Tools",
    "markup-vs-margin.html": "Markup vs Margin: Main Differences | NexusNova Tools",
    "mobile-data-budget.html": "Mobile Data Budget: Monthly Usage | NexusNova Tools",
    "overdraft-fee-opportunity-cost.html": "Overdraft Fees: Opportunity Cost | NexusNova Tools",
    "paycheck-budget-allocation.html": "Paycheck Budget Allocation Guide | NexusNova Tools",
    "pc-electricity-cost.html": "PC Electricity Cost Calculator | NexusNova Tools",
    "portfolio-rebalancing-bands.html": "Portfolio Rebalancing Bands Explained | NexusNova Tools",
    "printer-cost-per-page.html": "Printer Cost per Page Calculator | NexusNova Tools",
    "retirement-withdrawal-rate.html": "Retirement Withdrawal Rate Guide | NexusNova Tools",
    "seasonal-gas-heating-budget.html": "Seasonal Gas Heating Budget | NexusNova Tools",
    "sinking-funds-vs-emergency-funds.html": "Sinking Funds vs Emergency Funds | NexusNova Tools",
    "small-business-break-even.html": "Small Business Break-Even Analysis | NexusNova Tools",
    "solar-panel-payback-period.html": "Solar Panel Payback Period Calculator | NexusNova Tools",
    "subscription-annual-cost.html": "Subscription Annual Cost Calculator | NexusNova Tools",
    "tax-withholding-adjustment.html": "Tax Withholding Adjustment Guide | NexusNova Tools",
    "time-of-use-electricity-savings.html": "Time-of-Use Electricity Savings Guide | NexusNova Tools",
    "tire-pressure-fuel-savings.html": "Tire Pressure and Fuel Savings | NexusNova Tools",
    "water-heater-energy-cost.html": "Water Heater Energy Cost Calculator | NexusNova Tools",
    "water-leak-bill-estimate.html": "Water Leak Bill Estimate Calculator | NexusNova Tools",
    "zero-based-budget.html": "Zero-Based Budget: Give Every Dollar a Job | NexusNova Tools",
}
CASHFLOW_DESCRIPTION = (
    "Forecast small-business cash flow weekly with opening cash, expected invoice "
    "collections, supplier bills, payroll and tax reserves. Includes formulas and a worked example."
)

ACTION_PINS = {
    "actions/checkout": (
        "3d3c42e5aac5ba805825da76410c181273ba90b1", "v7.0.1"
    ),
    "actions/setup-node": (
        "949feb2413d6458794dcd2491c4babbbce0c15c1", "v7.1.0"
    ),
    "actions/setup-python": (
        "5fda3b95a4ea91299a34e894583c3862153e4b97", "v7.0.0"
    ),
    "actions/upload-artifact": (
        "cf430e030ddbb5b0abf93d22962f4752f3646cd9", "v7.0.2"
    ),
    "actions/download-artifact": (
        "9000827ccba6bdab643e8b6fd33ac0654aef8333", "v8.0.2"
    ),
    "actions/cache": (
        "55cc8345863c7cc4c66a329aec7e433d2d1c52a9", "v6.1.0"
    ),
    "actions/github-script": (
        "3a2844b7e9c422d3c10d287c895573f7108da1b3", "v9.0.0"
    ),
}


# The old news/archive articles explicitly quarantined by the approved AdSense plan
# remain noindex. These 16 original evergreen replacements complete the 100-page
# indexable SEO library without leaking quarantined pages into search or sitemap.
ARTICLE_REPLACEMENTS = [
{
"file":"business-cash-runway-calculation.html","title":"Business Cash Runway: Months of Cash","description":"Calculate small-business cash runway from unrestricted cash and realistic monthly net burn, with a worked example, scenario checks and practical limits.","lead":"Cash runway estimates how long a business can keep operating before available cash reaches its minimum safe level.","intro":"Runway is a liquidity measure, not an accounting-profit measure. A company can show positive revenue while using cash to pay overdue supplier invoices, build inventory or wait for customers to settle. Start with money available for ordinary operations, remove restricted balances and funds already owed as taxes or payroll deductions, and be explicit about the date of the balance. This gives the estimate a usable starting point rather than a reassuring but misleading bank total.","formula":"Runway in months = usable cash ÷ average monthly net cash burn","sections":[
("Define usable operating cash","Count cash that management can actually use for rent, payroll, suppliers and ordinary operations. Do not count a tax reserve, client trust balance, restricted grant or credit facility as though it were cash in the bank. If the bank balance includes money already committed to next week's payroll, subtract that obligation before applying the formula. State the measurement date and repeat the calculation from reconciled accounts rather than a remembered balance."),
("Measure net burn from cash movements","Net burn is cash paid out minus cash collected over a representative period. It is different from a book loss because depreciation, unpaid invoices, inventory movements and financing can move cash without matching the income statement. Use at least several months when the business is seasonal, and separate a one-time equipment purchase or legal settlement from ordinary monthly operating costs. If collections are delayed, actual cash history is often a better warning than optimistic invoice dates."),
("Use scenarios instead of one confident answer","Calculate a base case, a slower-collections case and a cost-pressure case. In the downside version, delay uncertain receipts and include known renewals, taxes, seasonal payroll and supplier deposits. Averages are useful when conditions are stable, but they can hide a sharp cash trough around a single due date. Runway should be paired with the lowest projected weekly balance, because a business can hit a payment problem before an average-month calculation suggests the cash is gone."),
("Choose a decision threshold in advance","A practical warning threshold might be the cash needed to cover the next payroll cycle plus unavoidable bills, but each business should document its own minimum. Decide in advance which actions start at each level: freeze optional purchases, collect overdue invoices, shorten supplier commitments or speak with a lender. An alert is more useful when it leads to a defined action than when it is simply displayed on a dashboard.")
],"example":"A company has $96,000 of unrestricted cash. Recent months show $18,000 of operating payments and $12,000 of collections, leaving $6,000 net monthly burn. The simple estimate is 16 months. If collections fall to $8,000 while monthly outflows rise to $20,000, burn becomes $12,000 and estimated runway drops to 8 months. That change justifies revisiting hiring and discretionary spending even though the opening bank balance has not changed.","table":[["Base case","$96,000","$6,000","16 months"],["Slower collections","$96,000","$9,000","10.7 months"],["Higher cost pressure","$96,000","$12,000","8 months"]],"pitfalls":"Do not treat a committed credit line as cash unless it is drawable and conditions are understood. Do not annualize one unusually good month without testing seasonality. Do not divide cash by gross expenses and call that runway when dependable collections continue. Record assumptions next to the estimate so another person can reproduce and challenge it.","next":"Update runway after a meaningful change in cash, collections, payroll or supplier terms. Pair the monthly estimate with a weekly cash forecast, an overdue-invoice list and a schedule of unavoidable payments. A forecast does not guarantee that a customer will pay on time; it makes the consequences of a delay visible while there is still room to react.","faq":["What if monthly burn is negative? If operating cash receipts consistently exceed cash payments, the business is not burning cash during that period; still model investment purchases, debt payments and seasonality before claiming unlimited runway.","Should financing be included? Show operating runway separately from cash after confirmed financing, and label conditional credit separately so the base case does not depend on funding that may never arrive."],
"related":[["cash-flow-forecast-small-business.html","Weekly cash-flow forecast"],["freelancer-hourly-rate.html","Price billable work"],["percentage-calculator.html","Calculate percentage changes"]]
},
{
"file":"gross-pay-vs-take-home-pay.html","title":"Gross Pay vs Take-Home Pay Explained","description":"Understand gross salary, payroll deductions and take-home pay with a transparent example, budgeting checklist and notes on location-specific tax rules.","lead":"Gross pay is the amount earned before payroll deductions; take-home pay is what remains after deductions are applied.","intro":"A salary offer and a bank deposit answer different questions. Gross pay describes compensation before deductions, while take-home pay reflects tax withholding, pension contributions, insurance premiums and other payroll items. Some benefits reduce cash received without reducing the value of compensation, and the rules vary by country, province, employer and employment contract. Use the payslip definitions first, then compare offers using the same pay frequency and the same assumptions.","formula":"Take-home pay = gross pay − employee deductions + reimbursements paid in cash","sections":[
("Separate earnings from deductions","Start with the gross amount for the relevant period and list each deduction once. Income tax withholding may be an estimate against an annual tax liability; social insurance and pension contributions follow their own rules. Health coverage, transport, loan repayments or voluntary savings may appear on the payslip but should not automatically be treated as tax. Reimbursements can increase the bank deposit but are not always ordinary salary. Keep employer-paid benefits separate from employee-paid amounts."),
("Normalize salary frequency","Annual salary divided by twelve gives a simple monthly average, but it does not always match a payroll calendar. Weekly and biweekly payrolls may produce different numbers of paydays in some months. Bonuses, commissions and overtime can vary, so record guaranteed base pay separately from uncertain compensation. When comparing two jobs, calculate the same annual and monthly views and do not mistake a higher gross offer for a higher guaranteed deposit."),
("Compare total compensation carefully","A job with a slightly lower take-home deposit may include employer pension contributions, medical coverage, paid leave or a reliable bonus. Those benefits may have real value, but they are not spendable cash today. Compare guaranteed cash, likely variable pay and noncash benefits in separate columns. If a new job changes commute, childcare or equipment costs, estimate those expenses separately rather than hiding them inside a payroll deduction."),
("Plan spending around dependable net income","Use a normal pay period after predictable deductions as the base for recurring expenses. Treat irregular commission, annual bonus and tax refunds as separate scenarios until received. If withholding changes midyear, update the budget instead of extrapolating an old payslip. A salary budget is not a tax filing; it is a cash-management tool that helps prevent rent, debt payments and savings targets from depending on money that will not reach the account.")
],"example":"Suppose monthly gross pay is $4,800. Employee tax withholding is $520, pension is $240, health coverage is $110 and a voluntary loan repayment is $80. The take-home amount before reimbursements is $3,850. If the employer later reimburses $60 of documented travel, the bank deposit may be $3,910, but the reimbursement should not be mistaken for recurring salary. The budget should be built from dependable pay and show reimbursements separately.","table":[["Gross pay","$4,800","Starting earnings"],["Tax + pension + coverage","$870","Payroll deductions"],["Loan repayment","$80","Other cash deduction"],["Take-home before reimbursements","$3,850","Spendable paycheck estimate"]],"pitfalls":"Do not compare monthly take-home from one country with annual gross from another. Do not assume every deduction is tax-deductible or that withholding equals final tax owed. Do not add employer pension contributions to spendable cash. If the payslip label is unclear, confirm its meaning with payroll instead of relying on a generic calculator.","next":"Create a one-page comparison showing annual gross, fixed deductions, typical net pay, variable earnings and benefits. Recheck it after a promotion, residency change, pension election or new insurance premium. A calculator can help organize the arithmetic, but the official payslip and current local payroll rules determine the amount actually owed or paid.","faq":["Is net pay the same as taxable income? Not necessarily. Taxable income is a rule-defined tax concept; take-home pay is cash after payroll deductions.","Can two employees with equal gross salary have different take-home pay? Yes. Location, benefits, pension elections, withholding settings and other permitted deductions can differ."],
"related":[["salary-tax-calculator-pakistan.html","Pakistan salary tax calculator"],["paycheck-budget-allocation.html","Allocate a paycheck"],["percentage-calculator.html","Calculate deduction rates"]]
},
{
"file":"effective-vs-marginal-tax-rate.html","title":"Effective vs Marginal Tax Rate Explained","description":"Learn how effective and marginal tax rates differ, calculate a simple example and avoid using one tax percentage to estimate every dollar of income.","lead":"The marginal rate applies to the next taxable unit of income; the effective rate summarizes tax as a share of a defined income base.","intro":"Tax brackets are often misunderstood as a single rate applied to all earnings. In a progressive system, portions of taxable income can be taxed at different rates, so an advertised top bracket is not the same as the share of all income paid in tax. The effective rate depends on the denominator chosen, such as taxable income or gross income, and can differ from the rate that applies to the next dollar.","formula":"Effective rate = total tax for the period ÷ stated income base × 100%","sections":[
("What the marginal rate tells you","The marginal rate estimates the tax applied to an additional unit of taxable income under the current rules. It is useful when evaluating extra overtime, a bonus, a side project or the next dollar of profit. The exact result can still depend on deductions, tax credits, benefit cliffs, surtaxes and social contributions. Marginal rate is a decision aid, not a promise that every additional dollar will have only that one effect on household cash."),
("What the effective rate summarizes","The effective rate divides total tax by a clearly defined income measure. If tax is $7,200 on $60,000 of taxable income, the effective rate on that base is 12%. If a report instead uses gross income that includes amounts excluded from the tax base, the ratio changes. State the denominator every time, because two people can report different effective rates while discussing the same tax bill."),
("Progressive brackets add up in layers","A simplified schedule might tax the first $20,000 at 10%, the next $30,000 at 20% and income above $50,000 at 30%. Someone with $60,000 of taxable income would not pay 30% on the first $60,000. Calculate each bracket layer separately, then add the amounts. Real tax rules can include allowances, deductions, credits and special rates, so always substitute official current thresholds for an illustrative teaching example."),
("Use the right rate for the decision","For a deduction or estimated tax bill, the effective rate may help describe an overall result. For an extra shift or taxable bonus, the marginal rate is usually the better starting point. For cash planning, payroll withholding can differ from final liability. Separate national and local taxes and include mandatory contributions only when the analysis is meant to cover all payroll burden rather than income tax alone.")
],"example":"Using a simplified bracket schedule, tax on the first $20,000 at 10% is $2,000; tax on the next $30,000 at 20% is $6,000; and tax on the final $10,000 at 30% is $3,000. Total tax is $11,000. On $60,000 of taxable income, the effective rate is 18.3%, while the top marginal rate applying to the last portion is 30%. This is an illustration, not a jurisdiction-specific filing calculation.","table":[["First $20,000 at 10%","$2,000","First bracket"],["Next $30,000 at 20%","$6,000","Second bracket"],["Final $10,000 at 30%","$3,000","Top bracket"],["Total on $60,000","$11,000","18.3% effective rate"]],"pitfalls":"Do not equate a top marginal rate with the rate on every dollar. Do not compare effective rates without checking whether the denominator is gross income, taxable income or another defined base. Avoid using a prior-year bracket table for current decisions, and do not treat a calculator example as tax advice for a different jurisdiction.","next":"Write down the tax year, jurisdiction, filing status, taxable-income definition and whether credits are included. Calculate bracket layers from official published rates, then check the result against a recognized tax calculator or professional advice when a filing, contract or financial decision depends on it.","faq":["Can the effective rate exceed the marginal rate? In ordinary progressive schedules that is uncommon, but credits, flat levies and denominator choices can change the comparison.","Why is my payslip withholding different? Withholding is a prepayment method; the final tax return applies the full year’s rules and permitted credits."],
"related":[["salary-tax-calculator-pakistan.html","Salary tax calculator"],["tax-withholding-adjustment.html","Withholding adjustment guide"],["percentage-calculator.html","Calculate an effective rate"]]
},
{
"file":"percent-vs-percentage-point.html","title":"Percent vs Percentage Point: The Difference","description":"See when to use percent change and percentage points, with clear examples for rates, surveys, fees and financial comparisons.","lead":"A percent describes a relative share; a percentage point describes the arithmetic difference between two percentages.","intro":"The two terms sound similar but answer different questions. Moving from 20% to 25% is a rise of five percentage points, because the displayed rates differ by five. Relative to the original 20% rate, the increase is 25%. Both statements are mathematically correct, but they communicate different scales. Using the wrong term can exaggerate or understate a change in an interest rate, survey result, fee or conversion metric.","formula":"Percentage-point change = new percentage − old percentage","sections":[
("Use percentage points for rate gaps","When comparing two values already expressed as percentages, subtract them to get the difference in percentage points. A savings rate from 8% to 10% rises by two percentage points. A survey share from 42% to 45% rises by three percentage points. This simple difference is normally the clearest way to describe the gap itself, especially where people need to compare policy rates or performance ratios."),
("Use percent change for relative movement","Percent change divides the numerical change by the original value. If a rate moves from 20% to 25%, the five-point difference divided by 20% equals a 25% relative increase. Percent change answers how large the move is compared with its starting level. It can be less intuitive if the starting rate is close to zero, so include the original and final values whenever possible."),
("Watch base effects and near-zero starting values","A one-point move can be huge relative to a low initial rate and small relative to a high one. From 1% to 2% is one percentage point but a 100% relative increase. From 40% to 41% is also one point but only a 2.5% relative increase. When a denominator is zero or extremely small, a percentage change may be undefined or too unstable for a sensible headline."),
("Choose language for the reader’s decision","Use percentage points for rate spreads, survey gaps and changes between proportions. Use percent change when measuring a relative increase or decrease compared with a defined starting figure. In headlines, charts and executive summaries, write the base values beside the change so readers can check the statement without guessing the denominator or assuming the word 'percent' refers to the right measure.")
],"example":"A fund fee falls from 1.20% to 0.90%. The rate declines by 0.30 percentage points. Relative to its original 1.20% level, the fee falls by 25%. On $10,000 invested for a year, the simple annual fee estimate changes from $120 to $90 before compounding, market movement or other costs. The point difference describes the rate gap; the relative change describes the size of the reduction against the previous fee.","table":[["Old rate","1.20%","Starting value"],["New rate","0.90%","Final value"],["Point change","-0.30 pp","New minus old"],["Relative change","-25%","Difference ÷ old"]],"pitfalls":"Do not say a rate rose by 5% when it moved from 20% to 25% unless you mean a 25% relative increase and explain the base. Never use percent change when the starting value is zero. When communicating small changes, include the units and both endpoint values to avoid ambiguity.","next":"Before publishing a change, write two lines: the raw difference in percentage points and the relative percent change. Keep only the measure that answers the question, and label the other when both are useful. Check that any graph axis and press summary use the same units as the calculation.","faq":["Is a 10% to 12% change two percent? It is two percentage points and a 20% relative increase from the original 10% rate.","Can percentage points be negative? Yes. If the new percentage is below the old percentage, the point change is negative."],
"related":[["percentage-change-calculator.html","Percentage change calculator"],["percentage-calculator.html","Percentage calculator"],["calculator.html","General calculator"]]
},
{
"file":"percent-change-vs-percent-difference.html","title":"Percent Change vs Percent Difference","description":"Learn the difference between percent change and percent difference, how to choose a base and how to report comparisons fairly.","lead":"Percent change uses a defined starting value; percent difference compares two values without treating either as the baseline.","intro":"Comparisons often become misleading when the formula is chosen after the result is seen. Percent change is directional: it explains how far a value moved from a known starting point to a new value. Percent difference is often used for two measurements when neither is the natural baseline, using their average as the denominator. The correct measure depends on the question, not on which formula produces the more dramatic number.","formula":"Percent change = (new − old) ÷ old × 100%","sections":[
("When percent change is the right tool","Use percent change for month-over-month revenue, an account balance before and after a fee, or fuel use compared with last week's figure. The original value is part of the question, so it belongs in the denominator. The sign matters: positive means an increase from the baseline and negative means a decrease. For repeated periods, keep the direction consistent and label whether the baseline is the prior month, year or scenario."),
("When percent difference helps compare two measurements","Percent difference is useful for two estimates or measurements when neither is the reference baseline. A common formula divides the absolute difference by the average of the two values. It reports separation relative to the typical size of the pair, which is different from asking whether one value increased from another. Scientific and technical fields may use different conventions, so state the formula if the convention matters."),
("Do not mix a change with a symmetric comparison","Comparing a planned cost of $100 with an actual cost of $120 is naturally a 20% increase from plan. A symmetric percent-difference calculation reports the same pair relative to their $110 average, around 18.2%. Neither answer is automatically wrong, but they answer different questions. Using percent difference in a variance report can blur responsibility for the baseline, while using percent change for two unrelated lab readings may imply a chronology that never existed."),
("Handle zero and rounding explicitly","Percent change is undefined when the original value is zero, and it becomes unstable for tiny baselines. The same applies to many percentage ratios when their denominator approaches zero. Percent difference also fails when both values are zero because the average denominator is zero. Use absolute difference or a clear 'not applicable' label instead of inventing a percentage. Round only after the calculation and preserve enough precision for small variances.")
],"example":"A service planned to cost $100 but invoices came to $120. Percent change versus plan is ($120 − $100) ÷ $100 = 20%. Percent difference between the two values is $20 ÷ $110 = 18.18%. If the business is reporting budget variance, the first formula is generally clearer because the approved plan is the baseline. If two independent instruments measured a quantity as 100 and 120, a symmetric comparison may be more appropriate.","table":[["Planned / old value","$100","Baseline"],["Actual / new value","$120","Comparison value"],["Percent change","20%","Uses original $100"],["Percent difference","18.18%","Uses average $110"]],"pitfalls":"Do not use percent difference when the purpose is explicitly to measure movement from a baseline. Do not use percent change without a meaningful old value. Avoid comparing percentages derived from different populations without explaining the base, and do not round intermediate numbers so aggressively that a small change becomes zero.","next":"Label the two values, decide whether one is the baseline, then choose the formula. Preserve the sign for percent change; use an absolute difference only if the comparison is intended to be symmetric. Store the formula next to dashboards and spreadsheets so future readers do not infer a different meaning from the same percent symbol.","faq":["Which formula should a budget report use? Usually percent change or variance against the approved budget, because the budget is the explicit baseline.","Can percent difference be negative? Many common definitions use the absolute difference, so it is non-negative; percent change is directional and can be negative."],
"related":[["percentage-change-calculator.html","Percentage change calculator"],["percentage-calculator.html","Percentage calculator"],["calculator.html","General calculator"]]
},
{
"file":"fixed-vs-variable-business-costs.html","title":"Fixed vs Variable Business Costs","description":"Separate fixed, variable and mixed costs for planning, pricing and break-even analysis, with a worked example and cost classification checklist.","lead":"Fixed costs stay broadly stable across a relevant activity range; variable costs move with the amount of work or output.","intro":"Cost behaviour helps a small business plan cash, set prices and estimate how sales affect profit. Rent may remain stable for a lease period, while packaging or payment-processing fees usually rise with each sale. A cost can be mixed: a base software subscription may include usage charges, and utilities can combine a standing charge with consumption. Classify costs over a stated period and activity range instead of assuming a label applies forever.","formula":"Total operating cost = fixed costs + (variable cost per unit × units) + mixed-cost variable component","sections":[
("Classify costs by behaviour, not by account name","The same accounting label can behave differently in different businesses. Delivery may be fixed for a monthly route contract but variable when each parcel is charged individually. A salaried team may be fixed over a normal output range, while overtime makes labour partly variable at higher volume. Write down the contract, pricing rule and relevant range rather than categorizing a cost from its name alone."),
("Estimate a variable cost per unit","Divide a representative set of activity-related costs by the number of units, orders, billable hours or customers that generated them. Keep sales tax collected for remittance separate from business revenue where appropriate. Remove one-off equipment purchases and unusual refunds from a typical unit estimate, but do not ignore recurring card fees, consumables, transaction charges or rework. The unit definition must match the quantity used in the sales forecast."),
("Understand the effect on contribution margin","Revenue from a sale first covers variable costs; the remaining contribution helps pay fixed costs and then profit. If an item sells for $50 and variable costs are $30, the contribution is $20. A fixed-cost increase does not change the contribution per unit directly, but it raises the sales volume needed to cover overhead. This is why discounted prices need both a unit-margin check and an overall volume plan."),
("Revisit classifications when scale changes","Costs can step up when a team needs another supervisor, warehouse or server plan. These are not perfectly fixed forever; they are stable only within a range. Build a note for known thresholds such as an extra shift, storage tier or merchant fee bracket. When the business expands, check whether the old cost curve still describes behaviour before using it to approve a new price or hiring decision.")
],"example":"A product sells for $50. Materials and packaging are $18 per unit, payment costs average $2 and per-order fulfilment adds $10, giving $30 variable cost and $20 contribution. Monthly rent, software and insurance total $6,000. Ignoring other costs, break-even volume is 300 units because $6,000 divided by $20 equals 300. A unit cost that is misclassified as fixed would distort both break-even volume and pricing choices.","table":[["Sales price per unit","$50","Revenue"],["Variable cost per unit","$30","Costs that scale with activity"],["Contribution per unit","$20","Price minus variable cost"],["Monthly fixed costs","$6,000","Rent, base software and insurance"]],"pitfalls":"Do not treat total variable cost as a per-unit amount, or use fixed costs from a different time period. Do not assume labour, cloud hosting or shipping has one behaviour under every contract. Check whether a tax is pass-through, a business expense or both under local rules; the correct treatment depends on the transaction and reporting basis.","next":"Build a simple cost table with the name, fixed portion, variable rule, unit, time period and evidence source. Recalculate it after price changes, supplier renegotiations or a new volume tier. A few clear assumptions are more useful than a perfect-looking spreadsheet whose cost categories cannot be explained.","faq":["Can a cost be partly fixed and partly variable? Yes. Split the base charge from the usage component when the contract supports that distinction.","Why does the relevant range matter? A cost may be stable at ordinary output and jump when capacity, staffing or storage thresholds are crossed."],
"related":[["small-business-break-even.html","Break-even analysis"],["cash-flow-forecast-small-business.html","Cash-flow forecasting"],["freelancer-hourly-rate.html","Hourly pricing guide"]]
},
{
"file":"customer-acquisition-cost-vs-lifetime-value.html","title":"Customer Acquisition Cost vs Lifetime Value","description":"Compare customer acquisition cost with customer lifetime value using consistent margin and retention assumptions, a worked unit-economics example and cautions.","lead":"Acquisition cost measures what it takes to win a customer; lifetime value estimates the contribution that customer generates over a defined relationship.","intro":"Marketing metrics are useful only when their definitions match. Customer acquisition cost, or CAC, divides relevant acquisition spend by the number of new customers attributed to that spend. Lifetime value, or LTV, estimates the value expected from a customer over a period or relationship, and should normally account for gross margin, retention, servicing and refunds. Revenue-only LTV can make an unprofitable business look healthy when fulfilment costs are high.","formula":"CAC = attributable acquisition cost ÷ new customers; LTV should be based on contribution, not just revenue","sections":[
("Keep acquisition costs in the numerator","Include the cost categories selected by the metric definition: paid media, creative, affiliate commissions, sales labour or marketing software. State whether overhead and existing staff time are included. Use the same campaign window for spend and attributed customers, and distinguish new paying customers from leads, trials or account sign-ups. If customers arrive after a long sales cycle, the attribution period may need to reflect that delay."),
("Estimate value from retained contribution","A useful LTV model begins with contribution per period after variable fulfilment and servicing costs, then applies realistic retention or churn assumptions. Contract length, purchase frequency, returns, discounting and expansion revenue can all matter. A simple average may work for a stable cohort, but different customer segments can have very different behaviour. Label whether the figure is observed historical value, a forecast, or a gross revenue proxy."),
("Read the ratio together with payback","An LTV-to-CAC ratio compares expected customer contribution with acquisition cost, but it does not show when cash returns. A long payback period can strain a business that has limited cash even if the ratio eventually looks attractive. Review monthly contribution, refund rates, time to first purchase and the cash needed to serve the customer before scaling a campaign. Cash runway and profitability are linked but not interchangeable."),
("Test sensitivity before spending more","Model what happens if conversion falls, advertising becomes more expensive or customers churn earlier than expected. Use conservative values for newer cohorts where there is little retention history. Monitor results by channel and segment rather than relying on a blended ratio that hides poor-performing acquisition sources. Do not optimize a metric by excluding reasonable costs or defining a customer after seeing the outcome.")
],"example":"A campaign spends $12,000 and generates 300 new paying customers, so CAC is $40. If the average customer contributes $18 a month after variable costs and the realistic paid lifetime is eight months, modeled contribution LTV is $144 before additional fixed costs and discounting. The simple ratio is 3.6 to 1. If retention falls to four months, contribution LTV falls to $72 and the ratio becomes 1.8 to 1. The retention assumption is doing real work in the result.","table":[["Acquisition spend","$12,000","Chosen campaign cost"],["New paying customers","300","Not leads or trials"],["CAC","$40","Spend divided by customers"],["Contribution LTV","$144","$18 × 8 months"]],"pitfalls":"Do not compare revenue LTV with fully loaded CAC without explaining the mismatch. Do not mix cohorts, currencies or time windows. Do not claim a universal healthy ratio: acceptable economics depend on gross margin, payback, capital costs and the business model. Use a cohort’s observed results as evidence, not a guarantee that future buyers will behave the same way.","next":"Create a metric dictionary before comparing marketing channels. Record included costs, new-customer definition, cohort period, contribution margin, retention assumptions and payback. Revisit the estimate when cohort behaviour changes and use downside scenarios for budget approvals. The metric should inform a decision, not replace the decision-maker’s review of cash needs and risk.","faq":["Should LTV use revenue or profit? Contribution after variable costs is usually more decision-useful; state the chosen definition.","Can a high LTV-to-CAC ratio still be risky? Yes. Slow payback, volatile retention, platform dependence and cash constraints can create risk even with a high projected ratio."],
"related":[["small-business-break-even.html","Business break-even"],["cash-flow-forecast-small-business.html","Cash-flow planning"],["percentage-calculator.html","Compare unit-economics ratios"]]
},
{
"file":"credit-card-minimum-payment-cost.html","title":"Credit Card Minimum Payment Cost Explained","description":"See how minimum payments affect payoff time and interest, using a transparent balance example and a checklist for reviewing card terms.","lead":"A minimum payment keeps an account current under its terms, but it may leave most of the balance accruing interest.","intro":"The minimum due is designed to satisfy a contract, not necessarily to repay a balance quickly. When the payment is only slightly larger than the new interest and fees, principal falls slowly. Purchases, cash advances, promotional offers and late fees can follow different rules, so a general example cannot replace the issuer’s agreement. The useful question is not only whether a payment meets the minimum, but how much it reduces the amount owed and when that reduction is expected to finish.","formula":"Approximate monthly interest = outstanding balance × annual rate ÷ 12","sections":[
("Understand how interest is calculated","Many cards calculate interest using daily balances and a daily periodic rate, so the monthly-rate shortcut is only an estimate. New transactions, payment dates and grace-period rules may alter interest. Cash advances can begin accruing interest immediately, while eligible purchase balances may have a grace period if the statement is paid in full. Read the terms for the relevant balance category rather than applying one annual percentage to every transaction."),
("Why small payments stretch payoff","Interest is charged on the unpaid balance. If the minimum is set as a percentage of the outstanding amount or as a fixed floor, the payment can shrink as the balance declines. A shrinking required payment is not necessarily a good payoff strategy because more of the debt remains outstanding for longer. Compare the required minimum with a consistent planned payment and include new spending so the forecast does not assume a balance that never actually exists."),
("Protect the basics while reducing debt","Pay at least the required amount by the due date to avoid contract consequences, and prioritize a missed or overdue account according to its terms. After essentials and a small cash buffer, a stable extra payment may reduce interest more reliably than irregular one-off payments. If rates vary, a promotional rate ends or fees change, update the estimate. Do not borrow more on the card while assuming the payoff calculation describes a static balance."),
("Use the statement and issuer tools","Look for the interest rate for each balance type, fees, minimum-payment formula, due date and any promotional expiration. The statement may show a payoff example at the minimum and at a larger fixed amount. That disclosure is useful but depends on the balance and rate assumptions shown. If hardship or repayment trouble has started, contact the issuer early to ask about formal options rather than ignoring notices.")
],"example":"For illustration, a $2,400 balance at 24% annual interest has a rough first-month interest estimate of $48 using 24% divided by 12. A $70 payment would reduce principal by about $22 before fees or new purchases. Actual daily-balance calculations can differ. If the card minimum falls in later months while the borrower continues using the account, the balance can remain for a long time even though every minimum is paid on schedule.","table":[["Starting balance","$2,400","Illustrative amount owed"],["Annual rate","24%","Card agreement controls"],["Rough monthly interest","$48","Balance × rate ÷ 12"],["Payment","$70","About $22 toward principal before other effects"]],"pitfalls":"Do not treat the monthly-rate shortcut as the issuer’s exact billing method. Do not ignore annual fees, cash advances, deferred interest or new transactions. Do not drain all emergency cash to accelerate a payment if that would force immediate reborrowing for essential bills; compare the cost and liquidity risk together.","next":"Use the current statement balance, card-specific rate and required payment formula to build a payoff estimate. Set an achievable fixed payment if the budget permits, stop adding discretionary charges during the plan and recheck the balance each statement cycle. For contract questions or financial hardship, issuer documents and qualified advice outrank generic web examples.","faq":["Will paying only the minimum hurt credit? It can keep the account current if paid on time, but a high revolving balance can still affect utilization and cost more interest.","Is the rate divided by twelve exact? No. Daily balances, payment timing and issuer terms can make the actual interest differ."],
"related":[["debt-avalanche-vs-snowball.html","Compare debt payoff methods"],["credit-utilization-explained.html","Credit utilization guide"],["percentage-calculator.html","Estimate interest amounts"]]
},
{
"file":"loan-payment-vs-total-loan-cost.html","title":"Loan Payment vs Total Loan Cost","description":"Compare a loan’s monthly payment with its full cost over time, including interest, fees and term length in a worked example.","lead":"The periodic payment affects monthly affordability; total loan cost reveals what borrowing costs over the full term.","intro":"A lower monthly payment can make a loan seem cheaper even when it requires years of extra interest. Lenders may reduce a payment by stretching the term, adjusting a rate or adding a final balloon payment. A useful comparison therefore shows the amount borrowed, term, interest rate, required fees, total scheduled payments and any large residual obligation. Keep optional insurance and bundled products visible because they can materially change the cash cost.","formula":"Total scheduled cost = all scheduled payments + upfront fees + required end payments","sections":[
("Separate principal from interest","Principal is the amount borrowed that remains to be repaid. Interest compensates the lender for the balance over time. At the beginning of many amortizing loans, a larger share of the payment covers interest because the outstanding principal is largest. Later payments generally reduce more principal if the rate and schedule remain stable. An amortization table makes this movement visible and helps explain why a few early extra payments can change total interest."),
("Compare terms at the same loan amount","To compare lenders fairly, use the same borrowed amount and similar repayment assumptions. A longer term usually reduces the payment by spreading principal over more periods, but interest may accumulate for longer. Check variable-rate features, intro periods, prepayment charges, late fees and origination costs. If one quote includes a bundled policy or add-on and another does not, compare the mandatory totals separately before deciding whether the extras have value."),
("Look beyond the monthly payment","A loan may have a final balloon payment, annual fee, required insurance or payment-adjustment clause. Include these in total cost and check whether the rate is fixed or can change. If the quote is variable, use scenarios instead of assuming today’s payment remains constant. For a vehicle or equipment purchase, include running costs and maintenance separately so the cheapest financing option is not mistaken for the cheapest ownership option."),
("Check affordability under stress","Calculate the payment under ordinary conditions and test a lower-income or higher-expense month. Ensure that the plan still covers housing, essentials and required reserves. A lender approval is not proof that a borrower should take the loan. Avoid maximizing the available term or amount solely to reach a payment that fits today; leave room for irregular costs and a change in rates where applicable.")
],"example":"Borrowing $10,000 over 36 months at a fixed rate may produce a higher monthly payment but fewer total payment periods. Extending the same loan to 60 months can lower the monthly amount while increasing the sum of payments and the time the borrower remains obligated. Exact figures depend on the APR, compounding convention and fees, so use the full quote rather than a monthly estimate alone.","table":[["Quote A","36 months","Higher scheduled payment"],["Quote B","60 months","Lower payment, longer term"],["Compare","All payments + fees","Total dollar cost"],["Stress test","Variable expenses or income","Affordability margin"]],"pitfalls":"Do not compare nominal rates without checking APR and fee disclosures. Do not forget balloon payments, mandatory add-ons or a rate that can reset. Do not add an optional product to only one quote and then attribute its cost to the loan rate. The contract and legally required disclosures define the real obligations.","next":"Keep the loan amount, term, rate, fees, first-payment date and total scheduled payments on one comparison sheet. Verify the amortization schedule against the lender’s formal disclosure, then decide whether the payment and total cost fit the full budget. If the result depends on a rate reset or uncertain fee, label that assumption instead of presenting a false exact total.","faq":["Does the lowest monthly payment mean the cheapest loan? No. It may reflect a longer term, balloon balance or fees.","Should extra principal payments be included? Model them separately and confirm the loan allows them without a charge or special processing condition."],
"related":[["loan-amortization-breakdown.html","Loan amortization guide"],["../tools/loan-payoff-calculator.html","Loan payoff calculator"],["percentage-calculator.html","Compare fee percentages"]]
},
{
"file":"vehicle-total-cost-of-ownership.html","title":"Vehicle Total Cost of Ownership Guide","description":"Estimate the full cost of owning a vehicle beyond the purchase price, including financing, fuel, insurance, maintenance, taxes and resale value.","lead":"A vehicle’s total cost includes the price paid to acquire it and the recurring cash costs of keeping it usable.","intro":"Comparing vehicles on sticker price alone misses costs that may dominate over several years. Fuel economy, insurance, registration, financing, maintenance, tyres and depreciation can all matter. A low-cost used car may need more repairs, while an efficient newer vehicle may carry a higher purchase price. The best comparison uses the same ownership horizon, expected distance, currency and local tax assumptions for each option rather than combining unrelated estimates.","formula":"Ownership cost over period = purchase and finance costs + running costs − expected resale proceeds","sections":[
("Use one ownership horizon","Choose a realistic period, such as three or five years, and estimate distance driven during that period. A car held for a long time may spread registration or setup costs across more years, while a short holding period makes resale price and depreciation more important. Compare the same kilometres or miles for both vehicles, and do not use one model’s new-car warranty assumptions for an older vehicle."),
("Estimate operating expenses from actual use","Fuel cost depends on distance, economy and local price. Insurance varies by driver, location, coverage and vehicle value. Maintenance and tyres depend on model, age, condition and usage. Use service records and insurer quotes where possible; mark estimates when records are unavailable. Separate fixed annual costs such as registration from usage-dependent costs such as fuel so changes in mileage can be modelled correctly."),
("Include financing and cash timing","The purchase price is not the same as total cash outlay when the vehicle is financed. Add scheduled payments, interest and required fees, while avoiding double-counting the principal and purchase price in the same total-cost formula. Show a cash-flow schedule for down payment and installments, and a separate ownership-cost summary that includes financing cost consistently. A loan may improve short-term cash flow but extend the period of obligation."),
("Treat resale value as an estimate","Expected resale proceeds reduce the net cost over the ownership period, but they are uncertain. Condition, mileage, market demand, import rules and maintenance history can move the value considerably. Model conservative, expected and optimistic resale scenarios. Avoid treating an online asking price as a guaranteed transaction value; use comparable completed sales or reputable valuation ranges when available.")
],"example":"Suppose a vehicle costs $18,000, financing and required fees add $1,400 of interest and charges over the chosen period, fuel costs are $3,600, insurance and registration total $2,700, and maintenance plus tyres total $1,800. Expected resale proceeds are $9,000. The rough net cost over the period is $18,000 + $1,400 + $3,600 + $2,700 + $1,800 − $9,000 = $18,500, before parking, tolls or exceptional repairs. It is not a monthly payment quote.","table":[["Purchase price","$18,000","Acquisition amount"],["Financing + fees","$1,400","Cost of borrowing"],["Fuel + insurance + maintenance","$8,100","Running costs"],["Resale estimate","-$9,000","Reduces net cost"]],"pitfalls":"Do not count loan principal twice. Do not compare five years for one car with three years for another, and do not assume resale proceeds are certain. If the vehicle’s use varies, test mileage scenarios rather than relying on a single cost per kilometre. Tax, registration and insurance rules vary by jurisdiction.","next":"Collect real quotes for insurance, service intervals, financing and fuel, then build a base and downside scenario. Include a reserve for irregular maintenance and keep business-use tax treatment separate from household cost. Before purchasing, compare expected total cost and monthly affordability; neither one alone captures the whole decision.","faq":["Should depreciation be included if I am tracking cash paid? For economic ownership cost, yes; for a cash-flow schedule, show purchase and sale cash separately. Avoid double counting.","Can a cheaper older vehicle cost more? Yes. Repairs, fuel use, insurance, downtime and resale can outweigh the lower purchase price."],
"related":[["fuel-cost-per-trip.html","Estimate fuel cost"],["../tools/loan-payoff-calculator.html","Loan payoff calculator"],["calculator.html","Run a cost comparison"]]
},
{
"file":"electricity-fixed-charges-vs-usage-cost.html","title":"Electricity Fixed Charges vs Usage Cost","description":"Separate electricity standing charges from energy usage and taxes, then estimate how kWh consumption and tariff changes affect a bill.","lead":"An electricity bill may combine charges that remain fixed with charges that change as consumption rises or falls.","intro":"Reducing electricity use can lower the variable portion of a bill, but it may not remove a monthly connection or meter charge. Many tariffs also include time-of-use rates, demand charges, taxes, fuel adjustments or tiered pricing. Read the bill’s billing period, units and tariff notes before estimating savings. A kWh price quoted in an advertisement is not necessarily the whole amount paid for every unit consumed.","formula":"Estimated bill = fixed charges + Σ(usage by tariff period × that period’s unit rate) + applicable adjustments and taxes","sections":[
("Identify every bill component","Record the fixed or standing charge, consumption charge, taxes, duties and any adjustment lines separately. Confirm whether rates are quoted with or without taxes. If the bill has a meter rent or service fee, treat it as fixed only for the current tariff and billing period; a tariff change can alter it. Do not assume that a single cost-per-kWh figure includes all charges shown by the provider."),
("Use the right energy unit","A kilowatt (kW) measures power, while a kilowatt-hour (kWh) measures energy used over time. A 1.5 kW appliance running for two hours uses about 3 kWh before losses or cycling behaviour. Multiplying kWh by a unit rate estimates usage cost; it does not automatically calculate fixed fees, demand charges or taxes. Check the meter and bill units before comparing an appliance estimate with the final bill."),
("Understand tariff blocks and timing","Some tariffs charge different rates at different times or consumption levels. Moving laundry or charging to a cheaper period only helps if the tariff really has a lower rate then and the appliance can be shifted safely. Monthly totals can also span different tariff updates. Align unit counts and prices to the same dates rather than applying the latest rate to an old bill without adjustment."),
("Measure savings realistically","Reducing usage lowers the variable component, not necessarily fixed charges. If an efficiency change saves 40 kWh in a month at a $0.20 unit rate, direct usage savings are about $8 before any tariff-specific adjustment. If taxes are proportional to consumption charges, savings may differ slightly; if they are fixed, they may not change. Estimate the full bill delta from the components rather than multiplying the headline average bill rate blindly.")
],"example":"A bill includes a $12 monthly service charge, 350 kWh at $0.18 per kWh, and $8 in taxes and adjustments. The estimate is $12 + $63 + $8 = $83. Cutting 40 kWh would reduce usage charges by $7.20 at that rate, giving about $75.80 if all other components stay fixed. Actual bills can vary due to tiered pricing, taxes and meter-period differences.","table":[["Service / standing charge","$12","Fixed in this example"],["Energy use","350 kWh × $0.18","$63"],["Taxes + adjustments","$8","Bill-specific"],["Estimated total","$83","All components included"]],"pitfalls":"Do not call kW and kWh interchangeable. Do not infer the entire marginal price from a total bill divided by usage when fixed fees are significant. Avoid assuming taxes, time-of-use tiers or fuel adjustments stay unchanged. If the provider’s tariff is ambiguous, use its published schedule and invoice notes.","next":"Create a small worksheet that records billing dates, kWh by rate period, fixed fees, taxes and adjustments. Use the same period when comparing bills, then make one change at a time so savings can be attributed correctly. Appliance estimates help prioritize actions; the provider’s tariff and measured consumption determine the actual bill.","faq":["Will using less electricity remove the standing charge? Usually not if the same connection remains active; check the tariff.","Why does my bill not equal kWh times the headline rate? Fixed fees, taxes, tiered pricing and adjustments may also apply."],
"related":[["electricity-appliance-kwh-cost.html","Appliance electricity cost"],["pc-electricity-cost.html","PC power cost"],["percentage-calculator.html","Compare bill changes"]]
},
{
"file":"invoice-payment-terms-net-30.html","title":"Net 30 Invoice Terms Explained","description":"Understand net 30 invoice due dates, cash-flow effects, late-payment clauses and practical ways for small businesses to track receivables.","lead":"Net 30 generally means payment is due 30 days after the contractual starting event, subject to the invoice and agreement.","intro":"An invoice term affects when a supplier expects cash, but it is not cash in the bank. Contracts can measure 30 days from invoice date, delivery, acceptance or a separate milestone, so do not assume the trigger without checking the agreed language. Weekends, public holidays, dispute processes and local law may affect the exact due date. Consistent terms reduce confusion, but written acceptance and a clear payment workflow matter just as much as the label.","formula":"Expected cash date = contractual due-date trigger + agreed payment period, adjusted only as the contract or law permits","sections":[
("Write the trigger and due date clearly","State whether the period begins on invoice date, receipt, completed delivery or accepted work. Include the due date where practical so the customer does not have to infer it. Make sure purchase orders, master agreements and invoices do not conflict. For cross-border customers, clarify currency, bank details and who pays transfer fees. Ambiguous terms invite disagreements over when a payment is late."),
("Plan receivables using realistic timing","A net 30 invoice may be paid earlier, on time or later, depending on customer process. Forecast expected cash using payment history and dispute status rather than assuming every invoice settles exactly on its due date. Large customers can have fixed payment runs, while a new customer may need onboarding or supplier registration. Track invoice sent date, acceptance, due date, outstanding balance and next follow-up in one receivables list."),
("Use follow-up without surprising the customer","Send a correct invoice with purchase-order references and supporting documents the customer needs. Confirm receipt, then send a concise reminder before and shortly after the due date. If an invoice is disputed, isolate the disputed portion and resolve the documentation gap. Late fees and suspension rights must be agreed and permitted by applicable law; do not add a charge after the fact and assume it is enforceable."),
("Negotiate terms against working capital","Longer payment terms may win a customer but require the supplier to finance wages, stock and tax obligations while waiting. Compare expected gross margin with the cost of capital, concentration risk and days sales outstanding. For smaller suppliers, a deposit, milestone payment or shorter term may be more important than a slightly higher price. Offer predictable paperwork and payment options without sacrificing clarity around acceptance and due dates.")
],"example":"A service invoice is dated March 2 with an agreement stating that net 30 runs from invoice date. If the contract does not modify the calendar rule, the nominal due date is 30 days later, around April 1 depending on the year and how days are counted in the agreement. If the contract instead starts the clock when work is accepted on March 9, the due date moves later. The invoice should state the agreed trigger, not invent one.","table":[["Invoice sent","March 2","Record the date"],["Acceptance date","March 9","Relevant only if terms use it"],["Payment term","Net 30","Start point comes from contract"],["Follow-up","Before / after due date","Use clear dates and records"]],"pitfalls":"Do not treat a net term as a promise that the money will clear on the due date. Do not ignore contract precedence, acceptance milestones, banking delays or an invoice dispute. Do not assume late charges are lawful or that a reminder replaces a required formal notice.","next":"Use a written template with the exact trigger, due date, currency, payment method and contact for disputes. Add invoice reminders to a cash calendar and forecast customer delays conservatively. When a payment becomes overdue, preserve a paper trail and confirm the next action under the signed agreement and applicable law.","faq":["Does net 30 always mean 30 days after the invoice date? No. The contract may define a different trigger such as delivery or acceptance.","Can I charge late fees automatically? Only where contract terms and applicable rules permit them; confirm the requirements first."],
"related":[["cash-flow-forecast-small-business.html","Weekly cash-flow forecast"],["invoice-maker.html","Create an invoice"],["freelancer-hourly-rate.html","Price services"]]
},
{
"file":"cash-reserve-vs-credit-line.html","title":"Cash Reserve vs Business Credit Line","description":"Compare cash reserves with a revolving credit line for working capital, including access conditions, financing costs and resilience trade-offs.","lead":"A cash reserve is money already available; a credit line is conditional access to borrowing that must usually be repaid with interest or fees.","intro":"Both can support working capital, but they are not interchangeable. Cash can cover an urgent obligation without a lender decision, while a credit line may preserve cash for other needs but introduces borrowing cost, covenants and availability conditions. A bank may change limits or require documents before drawing funds. Plan from cash first, understand the legal facility terms, and model borrowing as financing rather than as operating revenue.","formula":"Liquidity available today = unrestricted cash + only the credit amount that is currently drawable under its terms","sections":[
("Give cash reserves a specific purpose","A reserve can cover payroll, supplier deposits, tax deadlines, equipment failure or a temporary drop in collections. The right target depends on fixed obligations, business volatility and access to other funding. Separate a minimum operating reserve from money earmarked for tax or client commitments. If every cash dollar is assigned to another bill, the business may have a high bank balance without meaningful contingency liquidity."),
("Understand the credit line conditions","A credit agreement may specify borrowing-base rules, renewal dates, collateral, covenants, fees or limits on use. The nominal limit is not proof that all funds can be drawn in every situation. Availability can depend on receivables, inventory, financial reporting or lender approval. Note the interest calculation, minimum payments and repayment requirements. A credit line is most useful when the borrower can explain both the trigger for drawing and the source of repayment."),
("Compare the cost of holding cash","Cash may earn interest but can also have an opportunity cost if the funds could reduce expensive debt or support productive operations. A credit line creates interest and potential fees, while preserving cash may protect against revenue volatility. Compare the after-tax return, financing cost and likelihood of needing emergency funds. The lowest expected financial cost is not always the safest choice if it leaves the business unable to meet obligations during a downturn."),
("Build a layered liquidity policy","Define an ordinary operating minimum, a reserve target and circumstances that permit a credit draw. For example, reserve cash may cover normal payroll, while a committed credit line supports a temporary receivables delay after approval. Include repayment in the forecast and avoid rolling a short-term problem into permanent debt. Review the policy with actual cash movements and renewals; it should reflect lender conditions, not just a spreadsheet line labelled available credit.")
],"example":"A company has $60,000 of unrestricted cash and a $100,000 revolving facility, but only $70,000 is currently drawable after borrowing-base restrictions. Its immediate theoretical liquidity is $130,000 before outstanding cheques or other commitments, not $160,000. If it draws $25,000 to bridge an invoice delay, the forecast should show both the cash receipt and the future principal and interest repayment. The draw buys time; it does not create profit.","table":[["Unrestricted cash","$60,000","Already held"],["Facility limit","$100,000","Contract ceiling"],["Currently drawable","$70,000","After borrowing conditions"],["Combined liquidity estimate","$130,000","Before commitments and fees"]],"pitfalls":"Do not count a credit line that is expired, undrawn but unavailable, or subject to an unmet covenant. Do not hide the repayment schedule after a draw. Do not use borrowed cash to conceal a persistent operating loss without a credible corrective plan.","next":"Maintain a weekly cash forecast and a separate facility record showing limit, current availability, rate, fees, maturity and covenant conditions. Identify who may approve a draw and which forecast signal triggers it. Confirm the bank’s current availability rather than relying on last quarter’s paperwork.","faq":["Is a credit line part of revenue? No. A draw is financing and brings a repayment obligation.","Should the reserve be zero if credit is available? No. Access conditions and lender discretion mean cash reserves still provide independent protection."],
"related":[["emergency-fund-size-guide.html","Reserve sizing guide"],["cash-flow-forecast-small-business.html","Forecast cash by week"],["percentage-calculator.html","Compare financing rates"]]
},
{
"file":"inventory-turnover-days-inventory.html","title":"Inventory Turnover and Days Inventory","description":"Calculate inventory turnover and days inventory on hand, interpret stock movement and avoid mixing revenue with cost-based inventory measures.","lead":"Inventory turnover measures how often average inventory is used or sold over a period; days inventory translates that pace into an approximate number of days.","intro":"Inventory ties up cash before it becomes a completed sale. Too much stock can increase storage, expiry and obsolescence risk, while too little may create stockouts and lost orders. Turnover helps compare the pace of inventory movement, but it must use consistent units, periods and valuation. A high figure is not automatically good if it reflects frequent shortages, and a low figure can be normal for seasonal or specialised products.","formula":"Inventory turnover = cost of goods sold ÷ average inventory; days inventory ≈ days in period ÷ turnover","sections":[
("Use average inventory","The opening and closing balances can differ substantially around a seasonal peak or bulk purchase. A simple average of opening and closing inventory may be adequate for a stable business, but monthly or weekly averages give a better view when stock swings sharply. Use the same accounting valuation and currency across the period. If inventory is written down, transferred or counted with a different method, document the change before comparing turnover with an earlier period."),
("Keep the numerator and denominator aligned","Turnover usually uses cost of goods sold divided by average inventory at cost, not sales revenue divided by inventory at retail price. Revenue includes the markup, so using it can inflate the result and make comparisons unreliable. Match the cost period with the inventory valuation and explain any exclusions, such as work in progress or consigned stock. A consistent formula matters more than the number of decimal places."),
("Interpret turnover with service levels","Faster turnover can release cash and reduce carrying costs, but a very high figure may indicate that replenishment is too slow or safety stock is inadequate. A low figure can signal overbuying, slow demand or a long replenishment cycle, but it can also be appropriate for expensive spare parts. Check stockouts, fulfilment delays, discounts, spoilage and purchase lead times beside the turnover metric."),
("Use days inventory to plan replenishment","Days inventory provides an approximate translation of turnover into time. It is not an expiry guarantee or a precise date until every item sells; products move at different rates. Segment inventory by product family and use demand forecasts plus lead-time variability. Avoid using one warehouse-wide average to set reorder points for both a fast-selling basic item and a seasonal specialist product.")
],"example":"A shop records $240,000 of cost of goods sold over a 360-day internal reporting period. Average inventory at cost is $40,000. Turnover is 6 times per period and days inventory is about 360 ÷ 6 = 60 days. If stockouts also rise, simply pushing turnover higher could make service worse; review lead times and item-level demand before cutting average inventory further.","table":[["Cost of goods sold","$240,000","Matching period"],["Average inventory at cost","$40,000","Opening/closing average"],["Turnover","6 times","COGS ÷ average inventory"],["Days inventory","60 days","360 ÷ turnover"]],"pitfalls":"Do not use retail sales in the numerator against inventory valued at cost. Do not compare a 360-day turnover figure with a 365-day figure without noting the convention. Avoid treating the entire inventory pool as homogeneous when demand, margin and replenishment time vary widely.","next":"Calculate turnover from consistent financial records, then segment it by product and compare with stockouts, spoilage and supplier lead times. Use the trend to ask better questions about ordering and working capital rather than enforcing a universal target across different categories.","faq":["Is higher turnover always better? No. It may reduce holding cost but also indicate insufficient stock or missed sales.","Why use average inventory? It reduces the distortion from a single end-of-period stock balance, especially after a bulk purchase or seasonal build."],
"related":[["small-business-break-even.html","Business break-even guide"],["cash-flow-forecast-small-business.html","Cash-flow forecast"],["calculator.html","Calculate turnover"]]
},
{
"file":"average-vs-weighted-average.html","title":"Average vs Weighted Average Explained","description":"Choose between a simple average and weighted average, with formulas and worked examples for grades, prices, surveys and business metrics.","lead":"A simple average gives each observation equal influence; a weighted average gives influence according to a stated weight.","intro":"The arithmetic mean is familiar, but equal weighting is not always a fair summary. If five small orders and one large contract are averaged by order count, each order gets the same influence even though the contract accounts for most revenue. A weighted average matches the question by giving more influence to larger quantities, longer exposure or defined importance. Always explain what each weight represents so the result can be reproduced.","formula":"Simple mean = sum of values ÷ count; weighted mean = sum(value × weight) ÷ sum(weights)","sections":[
("Use a simple average for equal observations","A simple average makes sense when each item should count equally, such as the average score across students when each student has equal importance. Check whether the observations are on the same scale and drawn from a comparable group. Averages can still hide outliers, spread and a skewed distribution, so pair a mean with a range or median where that information would change the decision."),
("Choose weights with a clear meaning","Weights may represent quantity, population size, revenue, exposure time or an explicit rubric. They should relate to why an observation deserves more influence, not to the outcome someone hopes to obtain. Normalize units and ensure weights are non-negative when the intended interpretation requires it. If weights sum to 100%, the formula can be especially easy to explain, but dividing by the total weight works even when the raw weights are quantities."),
("Understand the direction of distortion","A weighted average can be higher or lower than a simple average depending on which observations receive larger weights. In price analysis, higher-quantity purchases deserve more influence on average price paid. In survey work, population or sampling weights may correct known representation differences if the method is valid. Applying arbitrary weights after seeing the answer changes the metric rather than correcting it."),
("Document missing data and zero weights","Decide how missing observations are handled and whether zero weight means the observation is deliberately excluded. Do not treat missing as zero unless zero is the actual measured value. In a weighted average, the denominator is total included weight, so a zero total weight makes the calculation undefined. Record the excluded set and reason so another analyst can reconstruct the result.")
],"example":"A buyer purchases 10 units at $8 and 90 units at $10. The simple average of the two prices is $9, giving both price quotes equal influence. The weighted average purchase price is (10 × $8 + 90 × $10) ÷ 100 = $9.80, which reflects the quantities actually purchased. If the two quotes described equal-sized stores rather than order quantities, the simple average might answer a different question more appropriately.","table":[["Small order","10 units × $8","$80"],["Large order","90 units × $10","$900"],["Simple quote average","($8 + $10) ÷ 2","$9.00"],["Weighted price paid","$980 ÷ 100 units","$9.80"]],"pitfalls":"Do not weight by a variable unrelated to the question. Do not use a weighted average to hide a small but important group. If data represent different populations or time windows, reconcile the definitions before summarizing them.","next":"Write the target question first, choose what constitutes one observation, then define the weight and denominator. Calculate both methods as a diagnostic when the weighting choice changes the outcome materially. Preserve the source values and weights instead of saving only the final average.","faq":["Do weights need to add to 100%? No, provided the formula divides by the total weight; percentages just make some models easier to read.","Can a weighted average equal a simple average? Yes, when all observations have equal weights or the particular values balance to the same result."],
"related":[["calculator.html","General calculator"],["percentage-calculator.html","Percentage calculator"],["cagr-vs-average-return.html","Compare return measures"]]
},
{
"file":"break-even-volume-vs-revenue.html","title":"Break-Even Volume vs Break-Even Revenue","description":"Distinguish break-even units from break-even sales revenue and calculate each using contribution margin, fixed costs and a clear product mix.","lead":"Break-even units are the quantity required to cover costs; break-even revenue expresses the corresponding sales value in currency.","intro":"A business may know its break-even point in dollars but still not know how many units it must sell. The two measures are related through price, variable cost and contribution margin. A calculation should state whether it assumes one product, a stable mix of products or a service billed by hour. When product mix changes, the average contribution margin can change too, so one fixed revenue target may no longer represent the same operating risk.","formula":"Break-even units = fixed costs ÷ contribution per unit; break-even revenue = fixed costs ÷ contribution-margin ratio","sections":[
("Calculate contribution before choosing the metric","Contribution per unit is selling price minus variable cost per unit. The contribution-margin ratio divides contribution by selling price. Fixed costs are covered by contribution, not by gross revenue alone. A product that sells for $100 but costs $80 in variable expenses contributes $20, while another product with the same price and $40 variable cost contributes $60. Treating them as equivalent units would distort the volume calculation."),
("Break-even units work best for one stable item","Divide the fixed-cost amount by contribution per unit to get units needed in the selected period. Round up to a whole unit where partial units cannot be sold. Include the same period for fixed costs, price and variable cost. If some costs step up after reaching capacity, model the next range separately; the first break-even point may not remain valid beyond the staffing or production threshold."),
("Break-even revenue supports mixed products","For a stable product mix, the contribution-margin ratio can estimate the sales revenue needed to cover fixed costs. If the mix shifts toward lower-margin products, the old ratio overstates coverage and sales must rise. Recalculate the weighted contribution ratio from realistic sales shares and review it as pricing or channel mix changes. If a business has highly variable bundles, scenario-based volume planning may be more useful than one universal break-even revenue number."),
("Keep profit targets separate from break-even","Break-even means operating contribution covers the modeled fixed costs; it does not automatically provide owner profit, debt principal, tax or a return on invested capital unless those costs were included. A target-profit model adds the required profit to fixed costs before dividing by contribution. Label the analysis period and included cost set, especially when presenting a chart to lenders or investors.")
],"example":"Fixed costs are $12,000 a month. A product sells for $60 and has $36 variable cost, so contribution is $24 per unit and the contribution-margin ratio is 40%. Break-even volume is 500 units; break-even revenue is $30,000. If the business wants $3,000 operating profit, the target becomes $15,000 ÷ $24 = 625 units, or $37,500 revenue at the same margin. The result changes if product mix or prices change.","table":[["Selling price","$60","Per unit"],["Variable cost","$36","Per unit"],["Contribution ratio","40%","$24 ÷ $60"],["Break-even","500 units / $30,000","$12,000 fixed costs"]],"pitfalls":"Do not divide fixed costs by price when variable costs are material. Do not apply a one-product formula to a changing product mix without a weighted margin. Do not omit owner compensation, required financing costs or other fixed obligations if the target is meant to represent the full operating goal.","next":"Create both views: units for operational planning and revenue for financial targets. State the period, product mix, contribution ratio and excluded costs. Review them when price, supplier terms or sales mix changes and use a downside scenario if sales volume is volatile.","faq":["Why can break-even revenue change without fixed costs changing? Price, variable costs and product mix can alter the contribution-margin ratio.","Does break-even include target profit? Not unless the target profit is deliberately added to the cost amount in the formula."],
"related":[["small-business-break-even.html","Small-business break-even guide"],["markup-vs-margin.html","Markup vs margin"],["percentage-calculator.html","Calculate contribution margin"]]
}
]

def get_attr(tag: str, key: str) -> str:
    match = re.search(
        r"\b" + re.escape(key) + r"\s*=\s*([\"'])(.*?)\1",
        tag, re.I | re.S
    )
    return html.unescape(match.group(2)).strip() if match else ""

def meta_tag_match(source: str, key: str, value: str):
    for match in re.finditer(r"<meta\b[^>]*>", source, re.I | re.S):
        tag = match.group(0)
        if get_attr(tag, key).lower() == value.lower():
            return match
    return None

def set_meta(source: str, key: str, value: str, content: str) -> str:
    tag_match = meta_tag_match(source, key, value)
    tag_content = f'<meta {key}="{html.escape(value, quote=True)}" content="{html.escape(content, quote=True)}">'
    if tag_match:
        tag = tag_match.group(0)
        content_pattern = re.compile(r"\bcontent\s*=\s*([\"']).*?\1", re.I | re.S)
        updated, count = content_pattern.subn(
            lambda _: f'content="{html.escape(content, quote=True)}"',
            tag, count=1
        )
        if count == 0:
            updated = tag[:-1] + f' content="{html.escape(content, quote=True)}">'
        return source[:tag_match.start()] + updated + source[tag_match.end():]
    head_end = re.search(r"</head\s*>", source, re.I)
    if head_end:
        return source[:head_end.start()] + tag_content + "\n" + source[head_end.start():]
    return tag_content + "\n" + source

def set_title(source: str, title: str) -> str:
    tag = "<title>" + html.escape(title, quote=False) + "</title>"
    pattern = re.compile(r"<title\b[^>]*>[\s\S]*?</title\s*>", re.I)
    updated, count = pattern.subn(tag, source, count=1)
    if count:
        return updated
    head_end = re.search(r"</head\s*>", source, re.I)
    return (source[:head_end.start()] + tag + "\n" + source[head_end.start()]) if head_end else tag + "\n" + source

def get_title(source: str) -> str:
    match = re.search(r"<title\b[^>]*>([\s\S]*?)</title\s*>", source, re.I)
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() if match else ""

def get_h1(source: str) -> str:
    match = re.search(r"<h1\b[^>]*>([\s\S]*?)</h1\s*>", source, re.I)
    if not match:
        return "Practical Guide"
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", match.group(1)))).strip()

def get_description(source: str) -> str:
    match = meta_tag_match(source, "name", "description")
    return get_attr(match.group(0), "content") if match else ""

def ensure_replacement_articles() -> int:
    """Create substantive evergreen replacements for approved noindex news pages."""
    added = 0
    for seed in ARTICLE_REPLACEMENTS:
        path = ARTICLE_DIR / seed["file"]
        if path.exists():
            continue
        filename = seed["file"]
        title_core = seed["title"]
        full_title = title_core + BRAND
        canonical = page_url(path)
        keywords = ", ".join(title_core.lower().replace(":", "").split()[:8])
        body = [
            f'<p>{html.escape(seed["intro"])}</p>',
            f'<h2>Formula and definitions</h2><p><strong>Formula:</strong> <code>{html.escape(seed["formula"])}</code></p>',
        ]
        for heading, paragraph in seed["sections"]:
            body.append(f'<h2>{html.escape(heading)}</h2><p>{html.escape(paragraph)}</p>')
        body.append(f'<h2>Worked example</h2><p>{html.escape(seed["example"])}</p>')
        table_rows = "".join(
            "<tr>" + "".join(f"<td>{html.escape(cell)}</td>" for cell in row) + "</tr>"
            for row in seed["table"]
        )
        body.append(
            '<table><thead><tr><th>Item</th><th>Calculation or value</th><th>Meaning</th></tr></thead>'
            f'<tbody>{table_rows}</tbody></table>'
        )
        body.append(f'<h2>Common mistakes</h2><p>{html.escape(seed["pitfalls"])}</p>')
        body.append(f'<h2>Next steps</h2><p>{html.escape(seed["next"])}</p>')
        faq = "".join(
            f'<h3>{html.escape(question)}</h3><p>{html.escape(answer)}</p>'
            for question, answer in (
                (seed["faq"][0].split("?",1)[0] + "?", seed["faq"][0].split("?",1)[1].strip()),
                (seed["faq"][1].split("?",1)[0] + "?", seed["faq"][1].split("?",1)[1].strip()),
            )
        )
        body.append(f'<h2>Frequently asked questions</h2>{faq}')
        # Related URLs may target sibling article pages or root-level tools.
        # Keep article links local to /articles/ and use ../ only for site-root tools.
        article_targets = {item.name for item in ARTICLE_DIR.glob("*.html")}
        article_targets.update(item["file"] for item in ARTICLE_REPLACEMENTS)
        related = " · ".join(
            f'<a href="{html.escape(href if href in article_targets or href.startswith(("http://", "https://", "../", "/")) else "../" + href, quote=True)}">{html.escape(label)}</a>'
            for href, label in seed["related"]
        )
        body.append(f'<p><strong>Related tools and guides:</strong> {related}</p>')
        body_html = "\n".join(body)
        schema = {
            "@context":"https://schema.org",
            "@type":"Article",
            "headline":title_core,
            "description":seed["description"],
            "datePublished":"2026-10-17",
            "dateModified":"2026-10-17",
            "author":{"@type":"Organization","name":"NexusNova Editorial Team"},
            "publisher":{"@type":"Organization","name":"NexusNova Tools","logo":{"@type":"ImageObject","url":BASE+"assets/nexusnova-logo-512.svg"}},
            "mainEntityOfPage":canonical,
        }
        source = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(seed["description"], quote=True)}">
<meta name="keywords" content="{html.escape(keywords + ", finance, practical guide", quote=True)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{html.escape(canonical, quote=True)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="NexusNova Tools">
<meta property="og:title" content="{html.escape(title_core, quote=True)}">
<meta property="og:description" content="{html.escape(seed["description"], quote=True)}">
<meta property="og:url" content="{html.escape(canonical, quote=True)}">
<meta property="og:image" content="{BASE}assets/nexusnova-logo-512.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(title_core, quote=True)}">
<meta name="twitter:description" content="{html.escape(seed["description"], quote=True)}">
<meta name="twitter:image" content="{BASE}assets/nexusnova-logo-512.svg">
<link rel="stylesheet" href="../assets/css/nn-inner-shell.css?v=20261017-final-100">
<link rel="stylesheet" href="../assets/css/footer-social.css?v=20261017-final-100">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False,separators=(",",":"))}</script>
</head>
<body class="nn-inner-page">
<header class="nn-header" data-nn-header>
<div class="nn-shell nn-header-row">
<a class="nn-brand" href="../index.html"><img src="../assets/logo.png" alt="NexusNova Tools Logo" class="nn-brand-logo-img" width="1040" height="345"><span class="nn-brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a>
<nav class="nn-nav" aria-label="Primary navigation"><a href="../index.html">Home</a><a href="../tools.html">All Tools</a><a href="../categories.html">Categories</a><a href="../articles.html" aria-current="page">Articles</a><a href="../guides.html">Guides</a></nav>
</div>
</header>
<main>
<section class="page-hero"><div class="container">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>›</span><a href="../articles.html">Articles</a><span>›</span><span>{html.escape(title_core)}</span></nav>
<span class="kicker">PRACTICAL DECISION GUIDE • OCTOBER 17, 2026</span>
<h1>{html.escape(title_core)}</h1>
<p class="article-lead">{html.escape(seed["lead"])}</p>
</div></section>
<section class="section"><div class="container article-shell"><article class="article-main">
{body_html}
</article></div></section>
</main>
<footer class="nn-footer nn-global-footer"><div class="nn-shell nn-global-footer-main"><p>Practical calculators, careful explanations and transparent limits from NexusNova Tools.</p><nav aria-label="Footer links"><a href="../about.html">About</a><a href="../editorial-policy.html">Editorial policy</a><a href="../privacy.html">Privacy</a><a href="../contact.html">Contact</a></nav><small>Educational information only; verify contracts, applicable rates and professional requirements before acting.</small></div></footer>
<script defer src="../assets/js/nn-inner-shell.js?v=20261016-related-content-v1"></script>
<script defer src="../assets/js/global-shell-guard.js?v=20261017-ui-sweep"></script>
</body>
</html>
'''
        plain_words = re.findall(r"[\w’'-]+", re.sub(r"<[^>]+>", " ", source))
        if len(plain_words) < 500:
            raise SystemExit(f"ERROR: generated article {filename} is too short ({len(plain_words)} words)")
        path.write_text(source, encoding="utf-8")
        added += 1
    return added

def trim_description(description: str, topic: str) -> str:
    description = re.sub(r"\s+", " ", html.unescape(description)).strip()
    if len(description) > 175:
        clipped = description[:171]
        if " " in clipped:
            clipped = clipped.rsplit(" ", 1)[0]
        description = clipped.rstrip(" ,;:-") + "."
    if len(description) < 70:
        description = (
            f"Learn how {topic.lower()} works with clear formulas, practical examples "
            "and planning tips to support better-informed decisions."
        )
        if len(description) > 175:
            description = description[:171].rsplit(" ", 1)[0].rstrip(" ,;:-") + "."
    return description

def concise_title(full_title: str, filename: str) -> str:
    mapped = TITLE_OVERRIDES.get(filename)
    if mapped:
        candidate = mapped
    else:
        current = re.sub(r"\s*\|\s*NexusNova Tools\s*$", "", full_title, flags=re.I).strip()
        max_core = 70 - len(BRAND)
        if len(current) > max_core:
            current = current[:max_core].rsplit(" ", 1)[0].rstrip(" ,:;|-")
        candidate = current + BRAND
    if len(candidate) > 70:
        core = candidate[:-len(BRAND)] if candidate.endswith(BRAND) else candidate
        core = core[:70 - len(BRAND)].rsplit(" ", 1)[0].rstrip(" ,:;|-")
        candidate = core + BRAND
    if len(candidate) < 20:
        candidate = (candidate[:-len(BRAND)].strip() + " Guide" + BRAND) if candidate.endswith(BRAND) else candidate
    if len(candidate) > 70:
        raise ValueError(f"{filename}: title cannot be fit to 70 characters: {candidate!r}")
    return candidate

def page_url(path: Path) -> str:
    return BASE + path.relative_to(ROOT).as_posix()

def canonical_url(source: str) -> str:
    match = re.search(
        r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>',
        source, re.I | re.S
    )
    return get_attr(match.group(0), "href") if match else ""

def is_indexable(source: str) -> bool:
    match = meta_tag_match(source, "name", "robots")
    return not (match and re.search(r"\bnoindex\b", get_attr(match.group(0), "content"), re.I))

def update_article(path: Path) -> bool:
    source = path.read_text(encoding="utf-8-sig")
    original = source
    title = concise_title(get_title(source), path.name)
    title_core = re.sub(r"\s*\|\s*NexusNova Tools\s*$", "", title, flags=re.I).strip()
    description = CASHFLOW_DESCRIPTION if path.name == "cash-flow-forecast-small-business.html" else trim_description(get_description(source), get_h1(source))
    source = set_title(source, title)
    source = set_meta(source, "name", "description", description)
    source = set_meta(source, "property", "og:title", title_core)
    source = set_meta(source, "name", "twitter:title", title_core)
    source = set_meta(source, "property", "og:description", description)
    source = set_meta(source, "name", "twitter:description", description)

    image_match = meta_tag_match(source, "property", "og:image")
    image = get_attr(image_match.group(0), "content") if image_match else ""
    if not image:
        image = BASE + "assets/nexusnova-logo-512.svg"
        source = set_meta(source, "property", "og:image", image)
    elif image.startswith("/"):
        image = BASE.rstrip("/") + image
        source = set_meta(source, "property", "og:image", image)
    elif not re.match(r"https?://", image, re.I):
        image = BASE + image.lstrip("./")
        source = set_meta(source, "property", "og:image", image)
    source = set_meta(source, "name", "twitter:image", image)

    # Keep existing article CSS intact; the quality audit recognizes nn-inner-shell.css as theme coverage.
    # Keep the structured Article headline aligned with the visible page title.
    source = re.sub(
        r'("headline"\s*:\s*)"(?:[^"\\]|\\.)*"',
        lambda m: m.group(1) + json.dumps(title_core, ensure_ascii=False),
        source, count=1
    )
    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False

def patch_phase2_sync_script() -> bool:
    """Repair the article index sync script without a brittle nested-regex parser."""
    path = ROOT / ".github/scripts/sync_phase2_content.py"
    source = path.read_text(encoding="utf-8")
    original = source
    output = []
    for line in source.splitlines():
        # Remove the invalid historical regex and its invocation. Existing
        # article records are removed after reading search-core.js below.
        if line.startswith("article_re=re.compile("):
            continue
        if line.startswith('core=article_re.sub('):
            continue
        if line.strip().startswith("if not indexable and canonical != page_url.rstrip"):
            output.append('    if not indexable or canonical != page_url.rstrip("/"): continue')
            continue
        output.append(line)
    source = "\n".join(output) + "\n"
    marker = 'core=CORE.read_text(encoding="utf-8-sig")'
    cleanup_line = 'core = "\\n".join(line for line in core.splitlines() if not (line.strip().startswith("{ title:") and \'type:"article"\' in line)) + "\\n"'
    if marker not in source:
        raise SystemExit("ERROR: cannot find search-core load line while repairing sync script")
    if cleanup_line not in source:
        source = source.replace(marker, marker + "\n" + cleanup_line, 1)
    # Require exactly the intended 100 indexable self-canonical article pages.
    if "if len(records) != 100:" not in source:
        source = source.replace(
            marker,
            'if len(records) != 100:\n    raise SystemExit(f"ERROR: expected 100 indexable self-canonical articles, found {len(records)}")\n' + marker,
            1
        )
    # Include only indexable self-canonical pages in both records and sitemap.
    source = source.replace(
        'if indexable and canonical == page_url.rstrip("/") and canonical.startswith(BASE + "articles/"): sitemap_records.append(record)',
        'if indexable and canonical == page_url.rstrip("/") and canonical.startswith(BASE + "articles/"): sitemap_records.append(record)'
    )
    if source != original:
        path.write_text(source, encoding="utf-8")
    return source != original

def upgrade_workflow_action_pins() -> tuple[int, list[str]]:
    """Upgrade all matching official Actions pins to verified Node-24-capable releases."""
    changed = 0
    versions: list[str] = []
    workflow_dir = ROOT / ".github/workflows"
    for path in sorted(list(workflow_dir.glob("*.yml")) + list(workflow_dir.glob("*.yaml"))):
        source = path.read_text(encoding="utf-8-sig")
        original = source
        updated_lines = []
        for line in source.splitlines(keepends=True):
            updated = line
            for action, (sha, version) in ACTION_PINS.items():
                match = re.match(r"^(\s*(?:-\s*)?uses:\s*)" + re.escape(action) + r"@[^\s#]+(?:\s+#.*)?(\r?\n)?$", line)
                if match:
                    newline = match.group(2) or ""
                    updated = match.group(1) + action + "@" + sha + " # " + version + newline
                    versions.append(f"{path.relative_to(ROOT).as_posix()}: {action}@{version}")
                    break
            updated_lines.append(updated)
        updated_source = "".join(updated_lines)
        if updated_source != original:
            path.write_text(updated_source, encoding="utf-8")
            changed += 1
    return changed, versions

def add_lighthouse_failure_diagnostics() -> bool:
    """Print individual failed Lighthouse audits when a category misses 100."""
    path = ROOT / ".github/workflows/live-performance-100.yml"
    source = path.read_text(encoding="utf-8-sig")
    original = source
    pattern = re.compile(
        r"(?m)^([ \t]*)failures=\[f'\{k\}=\{v\}' for k,v in scores\.items\(\) if v < 100\]\r?\n"
        r"\1if failures:\r?\n"
        r"\1    raise SystemExit\('Live Lighthouse 100 gate failed: '\+ ', '\.join\(failures\)\)"
    )
    def replace_block(match):
        indent = match.group(1)
        inner = indent + "    "
        lines = [
            indent + "failures=[f'{k}={v}' for k,v in scores.items() if v < 100]",
            indent + "if failures:",
            inner + "for category in ('performance','accessibility','best-practices','seo'):",
            inner + "    if scores.get(category, 100) < 100:",
            inner + "        print(f'FAILED LIGHTHOUSE CATEGORY: {category} score={scores[category]}')",
            inner + "        refs = data.get('categories', {}).get(category, {}).get('auditRefs', [])",
            inner + "        for ref in refs:",
            inner + "            audit = data.get('audits', {}).get(ref.get('id', ''), {})",
            inner + "            score = audit.get('score')",
            inner + "            if score is not None and score < 1:",
            inner + "                print('AUDIT_FAILURE', json.dumps({",
            inner + "                    'category': category,",
            inner + "                    'id': audit.get('id'),",
            inner + "                    'title': audit.get('title'),",
            inner + "                    'score': score,",
            inner + "                    'displayValue': audit.get('displayValue'),",
            inner + "                    'description': audit.get('description')",
            inner + "                }, ensure_ascii=False))",
            inner + "raise SystemExit('Live Lighthouse 100 gate failed: '+', '.join(failures))",
        ]
        return "\n".join(lines)
    source, count = pattern.subn(replace_block, source, count=1)
    if source != original and count:
        path.write_text(source, encoding="utf-8")
        return True
    return False

def main() -> None:
    if not ARTICLE_DIR.is_dir():
        raise SystemExit("ERROR: articles directory is missing")
    generated_articles = ensure_replacement_articles()
    print(f"SEO_REPLACEMENT_ARTICLES_ADDED count={generated_articles}")
    changed_articles = 0
    for path in sorted(ARTICLE_DIR.glob("*.html")):
        if update_article(path):
            changed_articles += 1

    self_canonical_pages = []
    for path in sorted(ARTICLE_DIR.glob("*.html")):
        source = path.read_text(encoding="utf-8-sig")
        canonical = canonical_url(source).rstrip("/")
        expected = page_url(path).rstrip("/")
        if canonical == expected and is_indexable(source):
            self_canonical_pages.append(path)
    if len(self_canonical_pages) != 100:
        raise SystemExit(
            f"ERROR: expected exactly 100 indexable self-canonical article pages; found {len(self_canonical_pages)}"
        )

    sync_patched = patch_phase2_sync_script()
    lighthouse_diagnostics = False  # Workflow YAML is updated directly through the repository API.
    workflow_files, action_versions = upgrade_workflow_action_pins()

    sync_path = ROOT / ".github/scripts/sync_phase2_content.py"
    run = subprocess.run(
        [sys.executable, str(sync_path)],
        cwd=ROOT, text=True, capture_output=True
    )
    if run.stdout:
        print(run.stdout.rstrip())
    if run.returncode:
        if run.stderr:
            print(run.stderr.rstrip(), file=sys.stderr)
        raise SystemExit(f"ERROR: article discovery synchronization failed with exit code {run.returncode}")

    # Assert the hard acceptance criteria without mutating protected logic.
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    article_sitemap_urls = set(re.findall(
        r"<loc>(https://nexusnovatools\.com/articles/[^<]+)</loc>", sitemap, re.I
    ))
    search_core = (ROOT / "assets/js/search-core.js").read_text(encoding="utf-8")
    article_records = re.findall(
        r'\{\s*title:"(?:[^"\\]|\\.)*",\s*url:"(?:[^"\\]|\\.)*",\s*type:"article",',
        search_core
    )
    expected_sitemap_count = sum(
        1 for path in self_canonical_pages
        if is_indexable(path.read_text(encoding="utf-8-sig"))
    )
    if len(article_sitemap_urls) != expected_sitemap_count:
        raise SystemExit(
            f"ERROR: sitemap has {len(article_sitemap_urls)} article URLs; "
            f"expected {expected_sitemap_count} indexable self-canonical articles, preserving approved noindex pages"
        )
    if len(article_records) != 100:
        raise SystemExit(f"ERROR: expected 100 search article records, found {len(article_records)}")

    print(
        "FINAL_SYSTEM_CLEANUP_PASS "
        f"article_files_scanned={len(list(ARTICLE_DIR.glob('*.html')))} "
        f"self_canonical_article_pages={len(self_canonical_pages)} "
        f"article_pages_changed={changed_articles} "
        f"sitemap_article_urls={len(article_sitemap_urls)} "
        f"indexable_sitemap_target={expected_sitemap_count} "
        f"search_article_records={len(article_records)} "
        f"sync_script_fixed={sync_patched} "
        f"lighthouse_diagnostics_added={lighthouse_diagnostics} "
        f"workflow_files_action_pins_updated={workflow_files} "
        f"action_pin_lines={len(action_versions)}"
    )
    # Ensure the chosen Article title cap is a real invariant, not an audit bypass.
    offending = []
    for path in ARTICLE_DIR.glob("*.html"):
        title = get_title(path.read_text(encoding="utf-8-sig"))
        if len(title) > 70:
            offending.append(f"{path.relative_to(ROOT)}={len(title)}")
    if offending:
        raise SystemExit("ERROR: article titles remain longer than 70 chars: " + ", ".join(offending))

if __name__ == "__main__":
    main()
