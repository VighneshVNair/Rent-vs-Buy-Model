
import { SimulationParams } from './types';

export const DEFAULT_PARAMS: SimulationParams = {
  years: 10,
  investmentReturnRate: 7.0,
  inflationRate: 3.0,
  capitalGainsTaxRate: 30.0,

  useSalaryBasedBudget: false,
  monthlySalary: 5000,
  salaryGrowthRate: 3.0,
  housingBudgetPercent: 40,
  housingBudgetPercentAnnualIncrease: 0.0,
  payDownMortgageEarly: false,

  homePrice: 500000,
  downPaymentPercent: 20,
  closingCostsPercent: 3.0,
  sellingCostsPercent: 6.0,
  homeAppreciationRate: 4.0,
  propertyTaxRate: 1.2,
  homeInsuranceYearly: 1200,
  maintenanceCostYearly: 1.0,
  marginalTaxRate: 25.0,

  rentOutPart: false,
  rentOutIncome: 800,

  mortgage1: {
    amount: 0, // Calculated dynamically if 0
    interestRate: 6.5,
    termYears: 30,
  },
  useMortgage2: false,
  mortgage2: {
    amount: 50000,
    interestRate: 8.0,
    termYears: 15,
  },
  pmiMonthly: 0,

  usePtz: false,
  ptzAmount: 60000,
  ptzTermYears: 20,

  monthlyRent: 2500,
  rentInsuranceMonthly: 20,
};
