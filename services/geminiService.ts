
import { GoogleGenAI } from "@google/genai";
import { SimulationParams, SimulationResult } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFinancialAnalysis = async (
  params: SimulationParams,
  results: SimulationResult
): Promise<string> => {
  const ai = getGeminiClient();

  // Format data for the prompt
  const years = params.years;
  const buyNW = results.summary.finalNetWorthBuy.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
  const rentNW = results.summary.finalNetWorthRent.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
  const diff = Math.abs(results.summary.finalNetWorthBuy - results.summary.finalNetWorthRent).toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
  const winner = results.summary.finalNetWorthBuy > results.summary.finalNetWorthRent ? "Buying" : "Renting";

  const ptzInfo = params.usePtz 
    ? `- Includes PTZ Loan: €${params.ptzAmount} at 0% interest` 
    : '- No PTZ Loan used';

  const rentalIncomeInfo = params.rentOutPart
    ? `- Generating €${params.rentOutIncome}/mo by renting part of the home (House Hacking)`
    : '';
  
  let budgetStrategyInfo = '';
  if (params.useSalaryBasedBudget) {
    budgetStrategyInfo = `- User Strategy: Fixed Budget of ${params.housingBudgetPercent}% of Salary (starting €${params.monthlySalary}/mo, growing at ${params.salaryGrowthRate}% annually).`;
    if (params.housingBudgetPercentAnnualIncrease !== 0) {
      budgetStrategyInfo += ` Note: The user aggressively increases this allocation percentage by ${params.housingBudgetPercentAnnualIncrease} points every year (lifestyle inflation control).`;
    }
    if (params.payDownMortgageEarly) {
      budgetStrategyInfo += `\n- Aggressive Repayment: User is using all budget surplus to PAY DOWN MORTGAGE EARLY (priority: Mortgage 2, then Mortgage 1) instead of investing in the market.`;
    } else {
      budgetStrategyInfo += `\n- Standard Investing: Surplus budget is invested in the stock market.`;
    }
  } else {
    budgetStrategyInfo = `- User Strategy: Auto-Match Highest Cost. The simulation assumes the user always has enough budget to cover the more expensive option, and invests the exact difference.`;
  }

  const prompt = `
    Act as a senior financial advisor. I have run a simulation for a client comparing "Buying a Home" vs "Renting and Investing".
    
    Here are the simulation parameters:
    - Duration: ${years} years
    - Home Price: €${params.homePrice}
    - Primary Mortgage: ${params.mortgage1.interestRate}% (Term: ${params.mortgage1.termYears} years)
    ${ptzInfo}
    ${rentalIncomeInfo}
    ${budgetStrategyInfo}
    - Monthly Rent: €${params.monthlyRent}
    - Investment Return Rate: ${params.investmentReturnRate}%
    - Capital Gains Tax Rate: ${params.capitalGainsTaxRate}% (Applied to investment profits)
    - Home Appreciation Rate: ${params.homeAppreciationRate}%
    - Inflation Rate: ${params.inflationRate}%

    Here are the simulation results after ${years} years:
    - Buying Net Worth: ${buyNW}
    - Renting Net Worth: ${rentNW}
    - Winner: ${winner} by ${diff}

    Please provide a concise, professional analysis (approx 3-4 paragraphs) covering:
    1. A direct summary of why the winning scenario performed better (e.g., was it appreciation leverage, PTZ impact, rental income from house hacking, or market returns?).
    2. Key risks for the buying scenario (e.g., maintenance shocks, market liquidity, tenant vacancy if renting out part).
    3. Key risks for the renting scenario (e.g., rent inflation, discipline to invest the difference).
    4. A final recommendation on what kind of person suits each path based on these numbers.

    Format the response in Markdown. Use bolding for key figures.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI advisor. Please try again later.";
  }
};
