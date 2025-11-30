
import React, { useState, useEffect } from 'react';
import { calculateSimulation } from './services/calculator';
import { generateFinancialAnalysis } from './services/geminiService';
import { SimulationParams, SimulationResult, SavedScenario } from './types';
import { DEFAULT_PARAMS } from './constants';
import { InputGroup, NumberInput, Toggle } from './components/InputSection';
import { NetWorthChart, EquityChart, MortgageScheduleChart } from './components/Charts';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<SimulationResult>(calculateSimulation(DEFAULT_PARAMS));
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input'); 
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  // Load scenarios from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rentVsBuyScenarios');
    if (saved) {
      try {
        setSavedScenarios(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved scenarios", e);
      }
    }
  }, []);

  useEffect(() => {
    const res = calculateSimulation(params);
    setResult(res);
    if (aiAnalysis) setAiAnalysis(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleAiRequest = async () => {
    if (!process.env.API_KEY) {
      alert("Please configure your API_KEY in the environment to use the AI Advisor.");
      return;
    }
    setLoadingAi(true);
    const analysis = await generateFinancialAnalysis(params, result);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const updateParam = (key: keyof SimulationParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedParam = (parent: 'mortgage1' | 'mortgage2', key: string, value: any) => {
    setParams(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
  };

  // --- Actions: Reset, Save, Delete, Export ---

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all inputs to default values?")) {
      setParams(DEFAULT_PARAMS);
    }
  };

  const handleSaveScenario = () => {
    const name = window.prompt("Enter a name for this scenario:", `Scenario ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const newScenario: SavedScenario = {
      id: Date.now().toString(),
      name,
      date: new Date().toISOString(),
      params: { ...params }
    };

    const updated = [newScenario, ...savedScenarios];
    setSavedScenarios(updated);
    localStorage.setItem('rentVsBuyScenarios', JSON.stringify(updated));
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    if (window.confirm(`Load scenario "${scenario.name}"? Unsaved changes will be lost.`)) {
      setParams(scenario.params);
    }
  };

  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this saved scenario?")) {
      const updated = savedScenarios.filter(s => s.id !== id);
      setSavedScenarios(updated);
      localStorage.setItem('rentVsBuyScenarios', JSON.stringify(updated));
    }
  };

  const handleExportCSV = () => {
    // 1. Simulation Summary Section
    const summaryRows = [
      ["SIMULATION RESULTS SUMMARY"],
      ["Metric", "Value"],
      ["Final Buying Net Worth", result.summary.finalNetWorthBuy.toFixed(2)],
      ["Final Renting Net Worth", result.summary.finalNetWorthRent.toFixed(2)],
      ["Initial Cash Outlay", result.summary.initialOutlay.toFixed(2)],
      ["Total Interest Paid", result.summary.totalInterestPaid.toFixed(2)],
      ["Total Principal Paid", result.summary.totalPrincipalPaid.toFixed(2)],
      ["Total Rent Paid", result.summary.totalRentPaid.toFixed(2)],
      [] // Blank line
    ];

    // 2. User Inputs Section
    const inputsRows = [
      ["USER INPUTS PARAMETERS"],
      ["Parameter", "Value"],
      ["Duration (Years)", params.years],
      ["Inflation Rate (%)", params.inflationRate],
      ["Investment Return Rate (%)", params.investmentReturnRate],
      ["Capital Gains Tax Rate (%)", params.capitalGainsTaxRate],
      ["Home Price", params.homePrice],
      ["Down Payment (%)", params.downPaymentPercent],
      ["Buying Closing Costs (%)", params.closingCostsPercent],
      ["Selling Closing Costs (%)", params.sellingCostsPercent],
      ["Home Appreciation Rate (%)", params.homeAppreciationRate],
      ["Property Tax Rate (%)", params.propertyTaxRate],
      ["Maintenance Cost (%)", params.maintenanceCostYearly],
      ["Home Insurance (Yearly)", params.homeInsuranceYearly],
      ["Marginal Tax Rate (%)", params.marginalTaxRate],
      ["House Hacking (Rent Out Part)", params.rentOutPart],
      ["House Hacking Income (Monthly)", params.rentOutIncome],
      ["Mortgage 1 Rate (%)", params.mortgage1.interestRate],
      ["Mortgage 1 Term (Years)", params.mortgage1.termYears],
      ["Use Mortgage 2", params.useMortgage2],
      ["Mortgage 2 Amount", params.mortgage2.amount],
      ["Mortgage 2 Rate (%)", params.mortgage2.interestRate],
      ["Mortgage 2 Term (Years)", params.mortgage2.termYears],
      ["Use PTZ Loan", params.usePtz],
      ["PTZ Amount", params.ptzAmount],
      ["PTZ Term", params.ptzTermYears],
      ["Monthly Rent", params.monthlyRent],
      ["Renters Insurance (Monthly)", params.rentInsuranceMonthly],
      ["Use Salary Budget Strategy", params.useSalaryBasedBudget],
      ["Monthly Salary", params.monthlySalary],
      ["Salary Growth Rate (%)", params.salaryGrowthRate],
      ["Housing Allocation (%)", params.housingBudgetPercent],
      ["Allocation Annual Increase (%)", params.housingBudgetPercentAnnualIncrease],
      ["Pay Down Mortgage Early", params.payDownMortgageEarly],
      [] // Blank line
    ];

    // 3. Yearly Data Section (Source for Graphs)
    const yearlyHeader = [
      "YEARLY DATA (NET WORTH & EQUITY CHARTS)",
      "", "", "", "", "", "", "", "", "", ""
    ];
    const yearlyColHeaders = [
      "Year",
      "Home Value",
      "Mortgage Balance",
      "Equity",
      "Buy Portfolio (Net)",
      "Rent Portfolio (Net)",
      "Buy Net Worth",
      "Rent Net Worth",
      "Interest Paid (Yearly)",
      "Principal Paid (Yearly)",
      "Rent Paid (Yearly)"
    ];

    const yearlyDataRows = result.yearlyData.map(row => [
      row.year,
      row.homeValue.toFixed(2),
      row.mortgageBalance.toFixed(2),
      row.equity.toFixed(2),
      row.buyScenarioPortfolio.toFixed(2),
      row.rentScenarioPortfolio.toFixed(2),
      row.buyTotalNetWorth.toFixed(2),
      row.rentTotalNetWorth.toFixed(2),
      row.yearlyInterestPaid.toFixed(2),
      row.yearlyPrincipalPaid.toFixed(2),
      row.rentCost.toFixed(2)
    ]);

    // 4. Monthly Data Section (Source for Mortgage Schedule)
    const monthlyHeader = [
      [],
      ["MONTHLY DATA (MORTGAGE SCHEDULE CHART)"],
      ["Month", "Interest Paid", "Principal Paid", "Total Mortgage Balance"]
    ];

    const monthlyDataRows = result.monthlyData.map(row => [
      row.month,
      row.interestPaid.toFixed(2),
      row.principalPaid.toFixed(2),
      row.balance.toFixed(2)
    ]);

    // Combine all sections
    const allRows = [
      ...summaryRows,
      ...inputsRows,
      yearlyHeader,
      yearlyColHeaders,
      ...yearlyDataRows,
      ...monthlyHeader,
      ...monthlyDataRows
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + allRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rent_vs_buy_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg">
               <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
               </svg>
             </div>
             <h1 className="text-xl font-bold text-white tracking-tight">Rent vs. Buy Analyzer</h1>
          </div>
          <div className="sm:hidden flex space-x-2">
            <button 
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'input' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Inputs
            </button>
             <button 
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Results
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Inputs */}
        <div className={`w-full md:w-96 flex-shrink-0 space-y-6 ${activeTab === 'input' ? 'block' : 'hidden md:block'}`}>
          
          {/* Action Bar */}
          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Reset
            </button>
            <button 
              onClick={handleSaveScenario}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto max-h-[calc(100vh-16rem)] custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Configuration</h2>
            
            <InputGroup label="Timeline & Market">
              <NumberInput label="Comparison Duration (Years)" value={params.years} onChange={v => updateParam('years', v)} suffix="yrs" />
              <NumberInput label="Inflation Rate" value={params.inflationRate} onChange={v => updateParam('inflationRate', v)} suffix="%" step={0.1} />
              <NumberInput label="Invest. Return Rate" value={params.investmentReturnRate} onChange={v => updateParam('investmentReturnRate', v)} suffix="%" step={0.1} />
              <NumberInput label="Capital Gains Tax Rate" value={params.capitalGainsTaxRate} onChange={v => updateParam('capitalGainsTaxRate', v)} suffix="%" step={0.1} />
            </InputGroup>

            <InputGroup label="Income & Budget Strategy">
              <Toggle label="Use Salary-Based Budget?" checked={params.useSalaryBasedBudget} onChange={v => updateParam('useSalaryBasedBudget', v)} />
              {params.useSalaryBasedBudget ? (
                 <div className="mt-2 space-y-3 pl-3 border-l-2 border-indigo-100">
                    <NumberInput label="Monthly Net Salary" value={params.monthlySalary} onChange={v => updateParam('monthlySalary', v)} prefix="€" step={100} />
                    <NumberInput label="Annual Salary Growth" value={params.salaryGrowthRate} onChange={v => updateParam('salaryGrowthRate', v)} suffix="%" step={0.1} />
                    <div className="border-t border-indigo-200 pt-2 mt-2">
                      <NumberInput label="Allocated to Housing/Savings" value={params.housingBudgetPercent} onChange={v => updateParam('housingBudgetPercent', v)} suffix="%" />
                      <NumberInput label="Annual Increase in Allocation" value={params.housingBudgetPercentAnnualIncrease} onChange={v => updateParam('housingBudgetPercentAnnualIncrease', v)} suffix="% pts" step={0.1} />
                    </div>
                    <div className="pt-2">
                      <Toggle label="Pay Down Mortgage Early?" checked={params.payDownMortgageEarly} onChange={v => updateParam('payDownMortgageEarly', v)} />
                      <p className="text-xs text-slate-500 mt-1">
                        {params.payDownMortgageEarly 
                          ? "Budget surplus will be used to pay off mortgage principal early (highest interest first)." 
                          : "Budget surplus will be invested in the stock market."}
                      </p>
                    </div>
                 </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  <b>Auto-Mode:</b> Budget is automatically set to the higher of Rent or Buy cost each month. This ensures a fair comparison with no debt.
                </p>
              )}
            </InputGroup>

            <InputGroup label="Property Details">
              <NumberInput label="Home Price" value={params.homePrice} onChange={v => updateParam('homePrice', v)} prefix="€" step={1000} />
              <NumberInput label="Down Payment" value={params.downPaymentPercent} onChange={v => updateParam('downPaymentPercent', v)} suffix="%" />
              <NumberInput label="Buying Closing Costs" value={params.closingCostsPercent} onChange={v => updateParam('closingCostsPercent', v)} suffix="%" step={0.1} />
              <NumberInput label="Selling Closing Costs" value={params.sellingCostsPercent} onChange={v => updateParam('sellingCostsPercent', v)} suffix="%" step={0.1} />
              <NumberInput label="Home Appreciation" value={params.homeAppreciationRate} onChange={v => updateParam('homeAppreciationRate', v)} suffix="%" step={0.1} />
            </InputGroup>

            <InputGroup label="Ongoing Ownership Costs">
              <NumberInput label="Annual Property Tax" value={params.propertyTaxRate} onChange={v => updateParam('propertyTaxRate', v)} suffix="%" step={0.01} />
              <NumberInput label="Annual Maintenance" value={params.maintenanceCostYearly} onChange={v => updateParam('maintenanceCostYearly', v)} suffix="%" step={0.1} />
              <NumberInput label="Annual Insurance" value={params.homeInsuranceYearly} onChange={v => updateParam('homeInsuranceYearly', v)} prefix="€" />
              <NumberInput label="Marginal Tax Rate" value={params.marginalTaxRate} onChange={v => updateParam('marginalTaxRate', v)} suffix="%" />
            </InputGroup>
            
            <InputGroup label="Rental Income (House Hacking)">
               <Toggle label="Rent out part of home?" checked={params.rentOutPart} onChange={v => updateParam('rentOutPart', v)} />
               {params.rentOutPart && (
                 <div className="mt-2 space-y-3 pl-3 border-l-2 border-green-100">
                    <NumberInput label="Monthly Income" value={params.rentOutIncome} onChange={v => updateParam('rentOutIncome', v)} prefix="€" step={50} />
                    <p className="text-xs text-slate-500">Income will increase with inflation and is taxed at marginal rate.</p>
                 </div>
               )}
            </InputGroup>

            <InputGroup label="Primary Mortgage">
              <NumberInput label="Interest Rate" value={params.mortgage1.interestRate} onChange={v => updateNestedParam('mortgage1', 'interestRate', v)} suffix="%" step={0.125} />
              <NumberInput label="Loan Term" value={params.mortgage1.termYears} onChange={v => updateNestedParam('mortgage1', 'termYears', v)} suffix="yrs" />
            </InputGroup>

            <InputGroup label="State Aid (PTZ)">
               <Toggle label="Include PTZ Loan?" checked={params.usePtz} onChange={v => updateParam('usePtz', v)} />
               {params.usePtz && (
                 <div className="mt-2 space-y-3 pl-3 border-l-2 border-blue-100">
                    <NumberInput label="PTZ Amount" value={params.ptzAmount} onChange={v => updateParam('ptzAmount', v)} prefix="€" step={1000} />
                    <NumberInput label="Repayment Term" value={params.ptzTermYears} onChange={v => updateParam('ptzTermYears', v)} suffix="yrs" />
                 </div>
               )}
            </InputGroup>

            <InputGroup label="Secondary Financing">
               <Toggle label="Use 2nd Mortgage?" checked={params.useMortgage2} onChange={v => updateParam('useMortgage2', v)} />
               {params.useMortgage2 && (
                 <div className="mt-2 space-y-3 pl-3 border-l-2 border-blue-100">
                    <NumberInput label="Loan Amount" value={params.mortgage2.amount} onChange={v => updateNestedParam('mortgage2', 'amount', v)} prefix="€" step={1000} />
                    <NumberInput label="Interest Rate" value={params.mortgage2.interestRate} onChange={v => updateNestedParam('mortgage2', 'interestRate', v)} suffix="%" step={0.125} />
                    <NumberInput label="Loan Term" value={params.mortgage2.termYears} onChange={v => updateNestedParam('mortgage2', 'termYears', v)} suffix="yrs" />
                 </div>
               )}
               <div className="mt-2">
                 <NumberInput label="Monthly PMI" value={params.pmiMonthly} onChange={v => updateParam('pmiMonthly', v)} prefix="€" />
               </div>
            </InputGroup>

             <InputGroup label="Renting Details">
              <NumberInput label="Monthly Rent" value={params.monthlyRent} onChange={v => updateParam('monthlyRent', v)} prefix="€" step={50} />
              <NumberInput label="Renters Insurance" value={params.rentInsuranceMonthly} onChange={v => updateParam('rentInsuranceMonthly', v)} prefix="€" />
            </InputGroup>

          </div>

          {/* Saved Scenarios List */}
          {savedScenarios.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Saved Scenarios</h3>
              <div className="space-y-2">
                {savedScenarios.map(scenario => (
                  <div key={scenario.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50 transition-colors group">
                    <div onClick={() => handleLoadScenario(scenario)} className="flex-1 cursor-pointer">
                      <p className="text-sm font-semibold text-slate-700">{scenario.name}</p>
                      <p className="text-xs text-slate-500">{new Date(scenario.date).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteScenario(scenario.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Scenario"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className={`flex-grow space-y-6 ${activeTab === 'results' ? 'block' : 'hidden md:block'}`}>
          
          {/* Results Header */}
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-lg font-bold text-slate-900">Simulation Results</h2>
             <button 
               onClick={handleExportCSV}
               className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               Export Excel (CSV)
             </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BUY CARD */}
            <div className={`relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all ${result.summary.finalNetWorthBuy >= result.summary.finalNetWorthRent ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-white border-slate-200'}`}>
               <div className="absolute top-0 right-0 p-4 opacity-[0.08]">
                 <svg className="w-32 h-32 text-blue-900" fill="currentColor" viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
               </div>
               <div className="relative z-10">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Buying Scenario</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(result.summary.finalNetWorthBuy)}</h3>
                <p className="text-sm text-slate-500 mt-1">Projected Net Worth</p>
                <div className="mt-5 space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 border-b border-blue-100 pb-1">
                    <span>Final Home Value</span>
                    <span className="font-medium">{formatCurrency(result.yearlyData[result.yearlyData.length - 1]?.homeValue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 border-b border-blue-100 pb-1 pt-1">
                    <span>Interest Paid</span>
                    <span className="font-medium">{formatCurrency(result.summary.totalInterestPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 pt-1">
                    <span>Principal Paid</span>
                    <span className="font-medium">{formatCurrency(result.summary.totalPrincipalPaid)}</span>
                  </div>
                </div>
               </div>
            </div>

            {/* RENT CARD */}
            <div className={`relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all ${result.summary.finalNetWorthRent > result.summary.finalNetWorthBuy ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-300' : 'bg-white border-slate-200'}`}>
               <div className="absolute top-0 right-0 p-4 opacity-[0.08]">
                 <svg className="w-32 h-32 text-teal-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
               </div>
               <div className="relative z-10">
                <p className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">Renting Scenario</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(result.summary.finalNetWorthRent)}</h3>
                <p className="text-sm text-slate-500 mt-1">Projected Net Worth</p>
                <div className="mt-5 space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 border-b border-teal-100 pb-1">
                    <span>Rent Paid</span>
                    <span className="font-medium">{formatCurrency(result.summary.totalRentPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 pt-1">
                    <span>Initial Portfolio</span>
                    <span className="font-medium">{formatCurrency(result.summary.initialOutlay)}</span>
                  </div>
                </div>
               </div>
            </div>
          </div>

          {/* Main Charts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <NetWorthChart data={result.yearlyData} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <EquityChart data={result.yearlyData} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <MortgageScheduleChart data={result.monthlyData} />
          </div>

          {/* AI Analysis Section */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-xl shadow-lg p-6 text-white relative overflow-hidden ring-1 ring-white/10">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 mt-1">
                   <svg className="w-5 h-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Financial Advisor</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-lg">Get a personalized risk assessment and recommendation based on your specific simulation numbers.</p>
                </div>
              </div>
              <button 
                onClick={handleAiRequest}
                disabled={loadingAi}
                className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 min-w-[160px]"
              >
                {loadingAi ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  'Generate Analysis'
                )}
              </button>
            </div>

            <div className="relative z-10 bg-white/5 rounded-lg border border-white/10 p-4 min-h-[100px]">
              {aiAnalysis ? (
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
                   <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                  <p className="text-slate-500 text-sm italic">
                    Tap the button above to start the analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
