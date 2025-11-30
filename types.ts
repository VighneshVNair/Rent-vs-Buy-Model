
export interface MortgageDetails {
  amount: number;
  interestRate: number; // Percentage
  termYears: number;
}

export interface SimulationParams {
  // General
  years: number;
  investmentReturnRate: number; // Percentage
  inflationRate: number; // Percentage (for Rent, Maint, Tax, Ins)
  capitalGainsTaxRate: number; // Percentage applied to investment profits

  // Budget Strategy
  useSalaryBasedBudget: boolean;
  monthlySalary: number;
  salaryGrowthRate: number; // Percentage annual increase
  housingBudgetPercent: number; // % of salary allocated to housing + savings
  housingBudgetPercentAnnualIncrease: number; // Annual increase in percentage points (e.g. 1.0 = +1% per year)
  payDownMortgageEarly: boolean; // If true, surplus goes to mortgage principal instead of portfolio

  // Buy Scenario
  homePrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;
  sellingCostsPercent: number;
  homeAppreciationRate: number; // Percentage
  propertyTaxRate: number; // Percentage of Home Value
  homeInsuranceYearly: number;
  maintenanceCostYearly: number; // Percentage of Home Value
  marginalTaxRate: number; // For tax deduction savings
  
  // Buy Side Rental Income (House Hacking)
  rentOutPart: boolean;
  rentOutIncome: number; // Monthly

  // Mortgages
  mortgage1: MortgageDetails;
  useMortgage2: boolean;
  mortgage2: MortgageDetails;
  pmiMonthly: number; // Private Mortgage Insurance if applicable

  // PTZ (Prêt à taux zéro)
  usePtz: boolean;
  ptzAmount: number;
  ptzTermYears: number;

  // Rent Scenario
  monthlyRent: number;
  rentInsuranceMonthly: number;
}

export interface YearlyResult {
  year: number;
  // Buy Data
  homeValue: number;
  mortgageBalance: number;
  equity: number;
  buyScenarioCashFlow: number; // Outflow
  buyScenarioPortfolio: number; // Accumulated investments from savings
  buyTotalNetWorth: number; // Equity + Portfolio - SellingCost (if sold now)
  yearlyInterestPaid: number;
  yearlyPrincipalPaid: number;
  
  // Rent Data
  rentCost: number;
  rentScenarioPortfolio: number; // Main investment vehicle
  rentTotalNetWorth: number;
}

export interface MonthlyResult {
  month: number;
  interestPaid: number;
  principalPaid: number;
  balance: number;
}

export interface SimulationResult {
  yearlyData: YearlyResult[];
  monthlyData: MonthlyResult[];
  summary: {
    finalNetWorthBuy: number;
    finalNetWorthRent: number;
    totalInterestPaid: number;
    totalRentPaid: number;
    totalPrincipalPaid: number;
    initialOutlay: number;
  };
}
