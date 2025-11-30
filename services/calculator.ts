
import { SimulationParams, SimulationResult, YearlyResult, MonthlyResult } from '../types';

export const calculateMortgagePayment = (principal: number, annualRatePercent: number, years: number): number => {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRatePercent === 0) return principal / (years * 12);
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
};

export const calculateSimulation = (params: SimulationParams): SimulationResult => {
  const {
    years,
    investmentReturnRate,
    inflationRate,
    capitalGainsTaxRate,
    useSalaryBasedBudget,
    monthlySalary,
    salaryGrowthRate,
    housingBudgetPercent,
    housingBudgetPercentAnnualIncrease,
    payDownMortgageEarly,
    homePrice,
    downPaymentPercent,
    closingCostsPercent,
    sellingCostsPercent,
    homeAppreciationRate,
    propertyTaxRate,
    homeInsuranceYearly,
    maintenanceCostYearly,
    marginalTaxRate,
    useMortgage2,
    usePtz,
    pmiMonthly,
    monthlyRent,
    rentInsuranceMonthly,
    rentOutPart,
    rentOutIncome
  } = params;

  // Initial Setup
  const downPaymentAmount = homePrice * (downPaymentPercent / 100);
  const initialClosingCosts = homePrice * (closingCostsPercent / 100);
  const totalInitialCashNeeded = downPaymentAmount + initialClosingCosts;

  // --- LOAN STACKING LOGIC ---
  // Total Borrowing Needed
  let totalLoanNeeded = Math.max(0, homePrice - downPaymentAmount);

  // 1. PTZ (Prêt à taux zéro) - Takes priority as it is free money
  let ptzAmount = usePtz ? params.ptzAmount : 0;
  // Cap PTZ if it exceeds total loan needed (unlikely but safe)
  if (ptzAmount > totalLoanNeeded) ptzAmount = totalLoanNeeded;

  // 2. Secondary Mortgage
  let m2Amount = useMortgage2 ? params.mortgage2.amount : 0;
  // Cap M2 if PTZ + M2 exceeds total needed
  if (ptzAmount + m2Amount > totalLoanNeeded) {
    m2Amount = Math.max(0, totalLoanNeeded - ptzAmount);
  }

  // 3. Primary Mortgage (The Remainder)
  let m1Amount = Math.max(0, totalLoanNeeded - ptzAmount - m2Amount);

  // Calculate Payments
  const m1MonthlyPayment = calculateMortgagePayment(m1Amount, params.mortgage1.interestRate, params.mortgage1.termYears);
  const m2MonthlyPayment = calculateMortgagePayment(m2Amount, params.mortgage2.interestRate, params.mortgage2.termYears);
  // PTZ is 0% interest, so just Principal / Months
  const ptzMonthlyPayment = calculateMortgagePayment(ptzAmount, 0, params.ptzTermYears);

  // State Variables
  let currentHomeValue = homePrice;
  let currentRent = monthlyRent;
  let currentRentInsurance = rentInsuranceMonthly;
  let currentSalary = monthlySalary;
  let currentHousingBudgetPercent = housingBudgetPercent;
  
  // Buy side income
  let currentBuySideRentIncome = rentOutPart ? rentOutIncome : 0;
  
  // Balances
  let m1Balance = m1Amount;
  let m2Balance = m2Amount;
  let ptzBalance = ptzAmount;

  // Portfolios
  // Buy Scenario Portfolio: Starts at 0. Receives surplus if BuyCost < RentCost.
  // Rent Scenario Portfolio: Starts with the Total Initial Cash Needed (Down + Closing).
  let buyPortfolio = 0;
  let buyPortfolioPrincipal = 0; // Track principal to calculate Capital Gains Tax
  
  let rentPortfolio = totalInitialCashNeeded;
  let rentPortfolioPrincipal = totalInitialCashNeeded; // Track principal to calculate Capital Gains Tax

  const yearlyResults: YearlyResult[] = [];
  const monthlyResults: MonthlyResult[] = [];
  const monthlyRateInv = investmentReturnRate / 100 / 12;

  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalRentPaid = 0;

  // Tracking for chart data (reset every year)
  let currentYearInterest = 0;
  let currentYearPrincipal = 0;

  const totalMonths = years * 12;

  // Variable Costs Multipliers
  const monthlyAppreciationMultiplier = Math.pow(1 + homeAppreciationRate / 100, 1 / 12);
  const monthlyInflationMultiplier = Math.pow(1 + inflationRate / 100, 1 / 12);
  const monthlySalaryGrowthMultiplier = Math.pow(1 + salaryGrowthRate / 100, 1 / 12);

  for (let m = 1; m <= totalMonths; m++) {
    // --- BUY SCENARIO COSTS ---
    
    // 1. Mortgage 1 (Minimum Required)
    let m1Interest = m1Balance * (params.mortgage1.interestRate / 100 / 12);
    let m1Principal = m1MonthlyPayment - m1Interest;
    if (m1Balance <= 0) { m1Interest = 0; m1Principal = 0; }
    // Check if remaining balance is less than calculated principal
    if (m1Principal > m1Balance) m1Principal = m1Balance;
    
    // 2. Mortgage 2 (Minimum Required)
    let m2Interest = m2Balance * (params.mortgage2.interestRate / 100 / 12);
    let m2Principal = m2MonthlyPayment - m2Interest;
    if (m2Balance <= 0) { m2Interest = 0; m2Principal = 0; }
    if (m2Principal > m2Balance) m2Principal = m2Balance;

    // 3. PTZ (Interest is always 0)
    let ptzPrincipal = ptzMonthlyPayment;
    if (ptzBalance <= 0) { ptzPrincipal = 0; }
    // Ensure we don't overpay principal on final month
    if (ptzPrincipal > ptzBalance) ptzPrincipal = ptzBalance;

    // Variable Costs
    const monthlyTax = (currentHomeValue * (propertyTaxRate / 100)) / 12;
    const monthlyMaint = (currentHomeValue * (maintenanceCostYearly / 100)) / 12;
    // Insurance scales with inflation
    const monthlyHomeIns = (homeInsuranceYearly * Math.pow(1 + inflationRate / 100, (m - 1) / 12)) / 12;
    
    // Tax Deduction: (Interest + PropertyTax) * MarginalRate
    const taxSavings = (m1Interest + m2Interest + monthlyTax) * (marginalTaxRate / 100);
    
    // Buy Side Rental Income (Net of Tax)
    let netBuySideRentIncome = 0;
    if (rentOutPart) {
      const incomeTax = currentBuySideRentIncome * (marginalTaxRate / 100);
      netBuySideRentIncome = currentBuySideRentIncome - incomeTax;
    }

    // Mandatory Outflow (Cash Leaving Pocket for Housing)
    // Note: We don't subtract Tax Savings from "Outflow" because you usually get that annually, 
    // but for monthly cashflow simplicity we can treat it as immediate liquidity or net cost.
    // However, if we are strictly calculating "Budget vs Cost", Net Cost is correct.
    const mandatoryGrossCost = m1MonthlyPayment + m2MonthlyPayment + ptzMonthlyPayment + monthlyTax + monthlyMaint + monthlyHomeIns + pmiMonthly;
    
    // This is the "Accounting Cost" for the month
    const netBuyCost = mandatoryGrossCost - taxSavings - netBuySideRentIncome;

    // --- RENT SCENARIO COSTS ---
    const totalRentCost = currentRent + currentRentInsurance;
    totalRentPaid += currentRent;

    // --- INVESTMENT & COMPARISON ---
    
    // Determine the Monthly Budget
    let monthlyBudget = 0;
    if (useSalaryBasedBudget) {
      // Fixed % of current salary, which can grow annually
      monthlyBudget = currentSalary * (currentHousingBudgetPercent / 100);
    } else {
      // Auto-match the higher cost
      monthlyBudget = Math.max(netBuyCost, totalRentCost);
    }

    // --- BUY SURPLUS LOGIC ---
    // Surplus = Budget - (Mandatory Outflows - Income/TaxBack)
    // Effectively: Surplus = Budget - NetBuyCost
    const buySurplus = monthlyBudget - netBuyCost;

    let extraPrincipalPaymentM1 = 0;
    let extraPrincipalPaymentM2 = 0;
    let amountInvestedBuySide = 0;

    if (buySurplus > 0) {
      // Logic: If user wants to pay down mortgage early, use surplus for that.
      // Priority: Pay High Interest (M2) -> Pay Lower Interest (M1) -> Invest.
      // We generally do NOT pay PTZ early as it is 0% interest.
      
      if (payDownMortgageEarly && useSalaryBasedBudget) {
        let remainingSurplus = buySurplus;

        // 1. Pay Mortgage 2 (Secondary usually higher rate)
        if (m2Balance > m2Principal) { // Balance after mandatory payment
           // How much can we pay?
           const potentialPayoff = m2Balance - m2Principal; 
           const payment = Math.min(potentialPayoff, remainingSurplus);
           extraPrincipalPaymentM2 = payment;
           remainingSurplus -= payment;
        }

        // 2. Pay Mortgage 1
        if (remainingSurplus > 0 && m1Balance > m1Principal) {
           const potentialPayoff = m1Balance - m1Principal;
           const payment = Math.min(potentialPayoff, remainingSurplus);
           extraPrincipalPaymentM1 = payment;
           remainingSurplus -= payment;
        }

        // 3. Remainder to Portfolio
        amountInvestedBuySide = remainingSurplus;

      } else {
        // Standard Strategy: Invest everything
        amountInvestedBuySide = buySurplus;
      }
    } else {
       // Negative surplus = Debt (represented as negative portfolio for simplicity)
       amountInvestedBuySide = buySurplus;
    }

    // Apply Investments
    buyPortfolio = (buyPortfolio * (1 + monthlyRateInv)) + amountInvestedBuySide;
    buyPortfolioPrincipal += amountInvestedBuySide;

    // --- UPDATE BALANCES WITH EXTRA PAYMENTS ---
    // Mandatory Principal
    let finalM1Principal = m1Principal + extraPrincipalPaymentM1;
    let finalM2Principal = m2Principal + extraPrincipalPaymentM2;

    m1Balance -= finalM1Principal;
    m2Balance -= finalM2Principal;
    ptzBalance -= ptzPrincipal;
    
    if (m1Balance < 0.01) m1Balance = 0;
    if (m2Balance < 0.01) m2Balance = 0;
    if (ptzBalance < 0.01) ptzBalance = 0;

    const monthlyTotalInterest = m1Interest + m2Interest;
    const monthlyTotalPrincipal = finalM1Principal + finalM2Principal + ptzPrincipal;

    totalInterestPaid += monthlyTotalInterest;
    totalPrincipalPaid += monthlyTotalPrincipal;

    currentYearInterest += monthlyTotalInterest;
    currentYearPrincipal += monthlyTotalPrincipal;
    
    // Store monthly data
    monthlyResults.push({
      month: m,
      interestPaid: monthlyTotalInterest,
      principalPaid: monthlyTotalPrincipal,
      balance: m1Balance + m2Balance + ptzBalance
    });


    // --- RENT SCENARIO INVESTMENT ---
    const rentSurplus = monthlyBudget - totalRentCost;
    rentPortfolio = (rentPortfolio * (1 + monthlyRateInv)) + rentSurplus;
    rentPortfolioPrincipal += rentSurplus;

    // Update Values for next month
    currentHomeValue *= monthlyAppreciationMultiplier;
    
    currentRent *= monthlyInflationMultiplier;
    currentRentInsurance *= monthlyInflationMultiplier;
    currentBuySideRentIncome *= monthlyInflationMultiplier;
    
    // Salary grows with its own rate
    currentSalary *= monthlySalaryGrowthMultiplier; 

    // Record Yearly Data
    if (m % 12 === 0) {
      const yearIndex = m / 12;

      // Increase housing budget allocation percent annually
      if (housingBudgetPercentAnnualIncrease !== 0) {
        currentHousingBudgetPercent += housingBudgetPercentAnnualIncrease;
        if (currentHousingBudgetPercent > 100) currentHousingBudgetPercent = 100;
      }

      const totalMortgageBalance = m1Balance + m2Balance + ptzBalance;
      const sellingCosts = currentHomeValue * (sellingCostsPercent / 100);
      
      // Calculate Net Liquid Value of Portfolios (After Capital Gains Tax)
      // Buy Portfolio Tax
      let netBuyPortfolioValue = buyPortfolio;
      if (buyPortfolio > buyPortfolioPrincipal) {
        const buyGain = buyPortfolio - buyPortfolioPrincipal;
        const buyTax = buyGain * (capitalGainsTaxRate / 100);
        netBuyPortfolioValue = buyPortfolio - buyTax;
      }
      
      // Rent Portfolio Tax
      let netRentPortfolioValue = rentPortfolio;
      if (rentPortfolio > rentPortfolioPrincipal) {
        const rentGain = rentPortfolio - rentPortfolioPrincipal;
        const rentTax = rentGain * (capitalGainsTaxRate / 100);
        netRentPortfolioValue = rentPortfolio - rentTax;
      }
      
      const buyNetWorth = (currentHomeValue - totalMortgageBalance - sellingCosts) + netBuyPortfolioValue;
      
      yearlyResults.push({
        year: yearIndex,
        homeValue: currentHomeValue,
        mortgageBalance: totalMortgageBalance,
        equity: currentHomeValue - totalMortgageBalance,
        buyScenarioCashFlow: netBuyCost + extraPrincipalPaymentM1 + extraPrincipalPaymentM2, // Show total cash out
        buyScenarioPortfolio: netBuyPortfolioValue, 
        buyTotalNetWorth: buyNetWorth,
        yearlyInterestPaid: currentYearInterest,
        yearlyPrincipalPaid: currentYearPrincipal,
        rentCost: totalRentCost,
        rentScenarioPortfolio: netRentPortfolioValue, 
        rentTotalNetWorth: netRentPortfolioValue,
      });

      // Reset yearly trackers
      currentYearInterest = 0;
      currentYearPrincipal = 0;
    }
  }

  const finalYear = yearlyResults[yearlyResults.length - 1];

  return {
    yearlyData: yearlyResults,
    monthlyData: monthlyResults,
    summary: {
      finalNetWorthBuy: finalYear?.buyTotalNetWorth || 0,
      finalNetWorthRent: finalYear?.rentTotalNetWorth || 0,
      totalInterestPaid,
      totalRentPaid,
      totalPrincipalPaid,
      initialOutlay: totalInitialCashNeeded,
    },
  };
};
