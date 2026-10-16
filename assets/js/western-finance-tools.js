'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.init(root.document);
})(typeof window === 'undefined' ? null : window, function () {
  const TAX_BRACKETS = Object.freeze({
    single: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [640600, .35], [Infinity, .37]],
    joint: [[24800, .10], [100800, .12], [211400, .22], [403550, .24], [512450, .32], [768700, .35], [Infinity, .37]],
    head: [[17700, .10], [67450, .12], [105700, .22], [201750, .24], [256200, .32], [640600, .35], [Infinity, .37]],
    separate: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [384350, .35], [Infinity, .37]]
  });

  function number(values, key) {
    const raw = values[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') return NaN;
    return Number(raw);
  }

  function validNonNegative(values, keys) {
    return keys.every(key => Number.isFinite(number(values, key)) && number(values, key) >= 0);
  }

  function taxFor(taxableIncome, filingStatus) {
    const brackets = TAX_BRACKETS[filingStatus];
    if (!brackets || !Number.isFinite(taxableIncome) || taxableIncome < 0) {
      return { ok: false, error: 'Enter a valid taxable income and choose a filing status.' };
    }
    let tax = 0;
    let lower = 0;
    let marginalRate = brackets[0][1];
    for (const [upper, rate] of brackets) {
      const taxableInBand = Math.max(0, Math.min(taxableIncome, upper) - lower);
      tax += taxableInBand * rate;
      if (taxableIncome <= upper) {
        marginalRate = rate;
        break;
      }
      lower = upper;
      marginalRate = rate;
    }
    return {
      ok: true,
      taxableIncome,
      filingStatus,
      tax: Math.round((tax + Number.EPSILON) * 100) / 100,
      marginalRate,
      effectiveRate: taxableIncome > 0 ? tax / taxableIncome : 0
    };
  }

  function simulatePayoff(balance, apr, monthlyPayment) {
    if (![balance, apr, monthlyPayment].every(Number.isFinite) || balance < 0 || apr < 0 || monthlyPayment <= 0) {
      return { ok: false, error: 'Enter a non-negative balance and APR, plus a monthly payment greater than zero.' };
    }
    if (balance === 0) return { ok: true, months: 0, interest: 0, totalPaid: 0 };
    const monthlyRate = apr / 1200;
    if (monthlyRate > 0 && monthlyPayment <= balance * monthlyRate) {
      return { ok: false, error: 'The payment does not cover the first month’s interest. Increase the payment or check the APR and balance.' };
    }
    let remaining = balance;
    let interestTotal = 0;
    let totalPaid = 0;
    for (let month = 1; month <= 1200; month += 1) {
      const interest = remaining * monthlyRate;
      const due = remaining + interest;
      const payment = Math.min(monthlyPayment, due);
      if (payment <= interest && remaining > 0) {
        return { ok: false, error: 'This payment schedule does not reduce the balance.' };
      }
      interestTotal += interest;
      totalPaid += payment;
      remaining = Math.max(0, due - payment);
      if (remaining < 0.005) {
        return { ok: true, months: month, interest: Math.round(interestTotal * 100) / 100, totalPaid: Math.round(totalPaid * 100) / 100 };
      }
    }
    return { ok: false, error: 'This schedule takes more than 100 years to repay. Increase the payment or review the inputs.' };
  }

  function computeWesternFinance(kind, values = {}) {
    if (kind === 'us-tax-brackets') {
      const income = number(values, 'income');
      return taxFor(income, String(values.filingStatus || 'single'));
    }

    if (kind === 'mortgage-payoff' || kind === 'loan-payoff') {
      const balanceKey = kind === 'mortgage-payoff' ? 'balance' : 'principal';
      const keys = [balanceKey, 'apr', 'payment', 'extra'];
      if (!validNonNegative(values, keys) || number(values, 'payment') <= 0) {
        return { ok: false, error: 'Enter valid non-negative numbers and a monthly payment greater than zero.' };
      }
      const balance = number(values, balanceKey);
      const apr = number(values, 'apr');
      const payment = number(values, 'payment');
      const extra = number(values, 'extra');
      const standard = simulatePayoff(balance, apr, payment);
      if (!standard.ok) return standard;
      const accelerated = simulatePayoff(balance, apr, payment + extra);
      if (!accelerated.ok) return accelerated;
      return {
        ok: true,
        balance,
        apr,
        standard,
        accelerated,
        monthsSaved: Math.max(0, standard.months - accelerated.months),
        interestSaved: Math.max(0, Math.round((standard.interest - accelerated.interest) * 100) / 100)
      };
    }

    if (kind === 'stock-profit') {
      const keys = ['buyPrice', 'sellPrice', 'shares', 'buyFees', 'sellFees', 'dividends'];
      if (!validNonNegative(values, keys) || number(values, 'buyPrice') <= 0 || number(values, 'sellPrice') < 0 || number(values, 'shares') <= 0) {
        return { ok: false, error: 'Enter positive buy price and share count, plus non-negative sell price, fees and dividends.' };
      }
      const buyPrice = number(values, 'buyPrice');
      const sellPrice = number(values, 'sellPrice');
      const shares = number(values, 'shares');
      const buyFees = number(values, 'buyFees');
      const sellFees = number(values, 'sellFees');
      const dividends = number(values, 'dividends');
      const cost = buyPrice * shares + buyFees;
      const proceeds = sellPrice * shares - sellFees + dividends;
      const profit = proceeds - cost;
      return {
        ok: true,
        cost: round2(cost),
        proceeds: round2(proceeds),
        profit: round2(profit),
        returnRate: cost > 0 ? profit / cost : 0,
        breakEvenPrice: (buyPrice * shares + buyFees + sellFees - dividends) / shares,
        shares
      };
    }

    if (kind === 'crypto-profit') {
      const keys = ['entryPrice', 'exitPrice', 'quantity', 'buyFeePct', 'sellFeePct'];
      if (!validNonNegative(values, keys) || number(values, 'entryPrice') <= 0 || number(values, 'quantity') <= 0 || number(values, 'buyFeePct') >= 100 || number(values, 'sellFeePct') >= 100) {
        return { ok: false, error: 'Enter a positive entry price and quantity, non-negative exit price and fees, and a sell fee below 100%.' };
      }
      const entryPrice = number(values, 'entryPrice');
      const exitPrice = number(values, 'exitPrice');
      const quantity = number(values, 'quantity');
      const buyFeeRate = number(values, 'buyFeePct') / 100;
      const sellFeeRate = number(values, 'sellFeePct') / 100;
      const grossCost = entryPrice * quantity;
      const grossProceeds = exitPrice * quantity;
      const cost = grossCost * (1 + buyFeeRate);
      const proceeds = grossProceeds * (1 - sellFeeRate);
      const profit = proceeds - cost;
      return {
        ok: true,
        grossCost: round2(grossCost),
        cost: round2(cost),
        proceeds: round2(proceeds),
        profit: round2(profit),
        returnRate: cost > 0 ? profit / cost : 0,
        breakEvenPrice: entryPrice * (1 + buyFeeRate) / (1 - sellFeeRate),
        quantity
      };
    }

    return { ok: false, error: 'This calculator type is not recognised.' };
  }

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function percent(value) {
    return (value * 100).toFixed(2) + '%';
  }

  function duration(months) {
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    if (!months) return 'Already paid off';
    if (!years) return months + (months === 1 ? ' month' : ' months');
    return years + (years === 1 ? ' year' : ' years') + (remainder ? ' and ' + remainder + (remainder === 1 ? ' month' : ' months') : '');
  }

  function formatResult(kind, result) {
    if (!result.ok) return result.error;
    if (kind === 'us-tax-brackets') {
      const statuses = { single: 'Single', joint: 'Married filing jointly', separate: 'Married filing separately', head: 'Head of household' };
      return [
        'Estimated 2026 US federal income tax: ' + money(result.tax),
        'Taxable income: ' + money(result.taxableIncome),
        'Filing status: ' + statuses[result.filingStatus],
        'Marginal federal bracket: ' + Math.round(result.marginalRate * 100) + '%',
        'Effective rate on taxable income: ' + percent(result.effectiveRate),
        '',
        'This estimate applies progressive ordinary-income brackets only. It is not a tax return and excludes credits, deductions not already reflected in taxable income, payroll taxes, state/local tax and preferential capital-gain rates.'
      ].join('\n');
    }
    if (kind === 'mortgage-payoff' || kind === 'loan-payoff') {
      return [
        'Scheduled payment only',
        'Estimated time to payoff: ' + duration(result.standard.months),
        'Estimated interest remaining: ' + money(result.standard.interest),
        'Total future payments: ' + money(result.standard.totalPaid),
        '',
        'With the extra monthly amount',
        'Estimated time to payoff: ' + duration(result.accelerated.months),
        'Estimated interest remaining: ' + money(result.accelerated.interest),
        'Total future payments: ' + money(result.accelerated.totalPaid),
        '',
        'Estimated interest saved: ' + money(result.interestSaved),
        'Payoff time shortened by: ' + (result.monthsSaved ? duration(result.monthsSaved) : '0 months'),
        '',
        'Estimate assumes a constant APR and end-of-month payments. Fees, escrow, rate changes, penalties and lender-specific rounding are not included.'
      ].join('\n');
    }
    if (kind === 'stock-profit') {
      return [
        'Estimated net trading result: ' + money(result.profit),
        'Return on estimated total cost: ' + percent(result.returnRate),
        'Estimated purchase cost including buy fee: ' + money(result.cost),
        'Net sale proceeds after sell fee and dividends: ' + money(result.proceeds),
        'Approximate break-even sale price per share: ' + money(result.breakEvenPrice),
        'Shares: ' + result.shares,
        '',
        'This is a trade-level estimate before tax. It excludes capital-gain tax, wash-sale rules, interest, foreign exchange, price slippage and any fees not entered above.'
      ].join('\n');
    }
    if (kind === 'crypto-profit') {
      return [
        'Estimated net trade profit/loss: ' + money(result.profit),
        'Return on total cost including buy fee: ' + percent(result.returnRate),
        'Cost including entry fee: ' + money(result.cost),
        'Proceeds after exit fee: ' + money(result.proceeds),
        'Approximate break-even exit price: ' + money(result.breakEvenPrice),
        'Quantity: ' + result.quantity,
        '',
        'Spot-trade arithmetic only. It excludes taxes, spread, network fees, slippage, funding, staking, mining and leveraged liquidation risk.'
      ].join('\n');
    }
    return 'No result.';
  }

  function init(doc) {
    if (!doc || !doc.body || !doc.body.dataset) return;
    const kind = doc.body.dataset.westernTool;
    if (!kind) return;
    const form = doc.getElementById('calculator-form');
    const output = doc.getElementById('result');
    const status = doc.getElementById('status');
    if (!form || !output) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const result = computeWesternFinance(kind, values);
      output.textContent = formatResult(kind, result);
      if (status) status.textContent = result.ok
        ? 'Calculated locally in your browser. Review the method and exclusions below before relying on the estimate.'
        : 'Please review the highlighted inputs: ' + result.error;
      output.dataset.resultState = result.ok ? 'success' : 'error';
    });
    form.addEventListener('reset', () => {
      output.textContent = 'Your result will appear here after you calculate.';
      if (status) status.textContent = 'Inputs reset. No values are sent to NexusNova.';
      delete output.dataset.resultState;
    });
  }

  return { computeWesternFinance, taxFor, simulatePayoff, formatResult, init };
});
