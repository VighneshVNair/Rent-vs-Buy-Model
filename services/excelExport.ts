import { SimulationParams, SimulationResult } from '../types';

// Declare globals loaded via CDN in index.html
declare const ExcelJS: any;
declare const saveAs: any;

// Helper to convert an SVG element (Recharts) to a PNG base64 string
const svgToPngBase64 = async (elementId: string, scale = 2): Promise<string | null> => {
  const wrapper = document.getElementById(elementId);
  const svgElement = wrapper?.querySelector('svg');

  if (!svgElement) {
    console.warn(`SVG not found for id: ${elementId}`);
    return null;
  }

  // Serialize the SVG to a string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);

  // Recharts sometimes relies on CSS, so we might need to inline styles or ensure the SVG is self-contained.
  // For simplicity, we assume the SVG is mostly self-contained.
  
  // Create an image to load the SVG
  const img = new Image();
  // We use standard base64 encoding for the svg data uri
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    img.onload = () => {
      // Create canvas to draw the image
      const canvas = document.createElement('canvas');
      // Scale up for better resolution in Excel
      const width = svgElement.clientWidth * scale;
      const height = svgElement.clientHeight * scale;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // White background for charts (SVGs are transparent by default)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Return base64 png (without the data:image/png;base64, prefix for ExcelJS sometimes)
        // ExcelJS addImage wants base64.
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl); 
      } else {
         resolve(null);
      }
    };
    img.src = url;
  });
};

export const generateExcelReport = async (
  params: SimulationParams,
  result: SimulationResult
) => {
  if (typeof ExcelJS === 'undefined') {
    console.error("ExcelJS library not loaded");
    alert("Excel export library is loading. Please try again in a moment.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rent vs. Buy Analyzer';
  workbook.created = new Date();

  // --- STYLING CONSTANTS ---
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // slate-900
  const headerFont = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
  
  const buyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FF' } }; // blue-50
  const rentFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } }; // teal-50
  
  const currencyFmt = '"€"#,##0.00';

  // --- SHEET 1: DASHBOARD ---
  const dashSheet = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
  
  // Title
  dashSheet.mergeCells('A1:E1');
  const titleCell = dashSheet.getCell('A1');
  titleCell.value = 'Rent vs. Buy Simulation Results';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center' };

  // Summary Table
  dashSheet.getCell('A3').value = 'Metric';
  dashSheet.getCell('B3').value = 'Buying Scenario';
  dashSheet.getCell('C3').value = 'Renting Scenario';

  // Style Header
  ['A3', 'B3', 'C3'].forEach(ref => {
    const c = dashSheet.getCell(ref);
    c.fill = headerFill;
    c.font = headerFont;
    c.alignment = { horizontal: 'center' };
  });

  // Data
  dashSheet.getCell('A4').value = 'Final Net Worth';
  dashSheet.getCell('B4').value = result.summary.finalNetWorthBuy;
  dashSheet.getCell('C4').value = result.summary.finalNetWorthRent;

  dashSheet.getCell('A5').value = 'Total Outflow (Int/Rent)';
  dashSheet.getCell('B5').value = result.summary.totalInterestPaid;
  dashSheet.getCell('C5').value = result.summary.totalRentPaid;

  dashSheet.getCell('A6').value = 'Total Principal / Initial';
  dashSheet.getCell('B6').value = result.summary.totalPrincipalPaid;
  dashSheet.getCell('C6').value = result.summary.initialOutlay;

  // Apply column styles
  ['B4', 'B5', 'B6'].forEach(ref => {
     dashSheet.getCell(ref).numFmt = currencyFmt;
     dashSheet.getCell(ref).fill = buyFill;
  });
  ['C4', 'C5', 'C6'].forEach(ref => {
     dashSheet.getCell(ref).numFmt = currencyFmt;
     dashSheet.getCell(ref).fill = rentFill;
  });
  
  dashSheet.getColumn('A').width = 25;
  dashSheet.getColumn('B').width = 25;
  dashSheet.getColumn('C').width = 25;

  // --- EMBED CHARTS ---
  // We will place charts below the summary.
  let currentRow = 8;
  const chartIds = ['net-worth-chart', 'equity-chart', 'mortgage-schedule-chart'];
  const chartTitles = ['Net Worth Projection', 'Asset Breakdown', 'Mortgage Schedule'];
  
  for (let i = 0; i < chartIds.length; i++) {
    const base64 = await svgToPngBase64(chartIds[i]);
    if (base64) {
      // Add title
      const titleRow = dashSheet.getRow(currentRow);
      titleRow.getCell(1).value = chartTitles[i];
      titleRow.getCell(1).font = { bold: true, size: 14 };
      currentRow += 1;

      // Add Image
      const imageId = workbook.addImage({
        base64: base64,
        extension: 'png',
      });
      
      // Calculate position
      dashSheet.addImage(imageId, {
        tl: { col: 0, row: currentRow - 1 }, // 0-indexed, so row 8 is index 7? No ExcelJS rows are 1-indexed for getRow but 0-indexed for addImage anchor?
        // Actually ExcelJS addImage uses 0-indexed col/row.
        // If currentRow is 9 (Excel Row), that is index 8.
        ext: { width: 600, height: 300 }
      });
      
      currentRow += 16; // Advance past image
    }
  }

  // --- SHEET 2: INPUTS ---
  const inputSheet = workbook.addWorksheet('Configuration');
  inputSheet.getColumn('A').width = 35;
  inputSheet.getColumn('B').width = 20;

  inputSheet.getCell('A1').value = 'Parameter';
  inputSheet.getCell('B1').value = 'Value';
  inputSheet.getRow(1).font = headerFont;
  inputSheet.getRow(1).fill = headerFill;

  const inputs = [
    { k: "Duration (Years)", v: params.years },
    { k: "Inflation Rate (%)", v: params.inflationRate },
    { k: "Invest. Return Rate (%)", v: params.investmentReturnRate },
    { k: "Capital Gains Tax (%)", v: params.capitalGainsTaxRate },
    { k: "Home Price", v: params.homePrice, fmt: currencyFmt },
    { k: "Down Payment (%)", v: params.downPaymentPercent },
    { k: "Monthly Salary", v: params.monthlySalary, fmt: currencyFmt },
    { k: "Salary Budget Strategy", v: params.useSalaryBasedBudget },
    { k: "Housing Allocation (%)", v: params.housingBudgetPercent },
    { k: "Monthly Rent", v: params.monthlyRent, fmt: currencyFmt },
    { k: "Mortgage 1 Rate (%)", v: params.mortgage1.interestRate },
    { k: "Mortgage 1 Term", v: params.mortgage1.termYears },
    { k: "Use PTZ", v: params.usePtz },
    { k: "PTZ Amount", v: params.ptzAmount, fmt: currencyFmt },
    { k: "Use House Hacking", v: params.rentOutPart },
    { k: "Rental Income", v: params.rentOutIncome, fmt: currencyFmt },
  ];

  inputs.forEach((item, idx) => {
    const row = inputSheet.getRow(idx + 2);
    row.getCell(1).value = item.k;
    row.getCell(2).value = item.v;
    if (item.fmt) row.getCell(2).numFmt = item.fmt;
  });

  // --- SHEET 3: YEARLY DATA ---
  const yearSheet = workbook.addWorksheet('Yearly Data');
  const yCols = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Home Value', key: 'homeValue', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Mortgage Bal', key: 'mortgageBalance', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Equity', key: 'equity', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Buy Portfolio', key: 'buyPortfolio', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Rent Portfolio', key: 'rentPortfolio', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Buy Net Worth', key: 'buyNW', width: 18, style: { numFmt: currencyFmt, fill: buyFill } },
    { header: 'Rent Net Worth', key: 'rentNW', width: 18, style: { numFmt: currencyFmt, fill: rentFill } },
    { header: 'Interest Paid', key: 'intPaid', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Principal Paid', key: 'prinPaid', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Rent Paid', key: 'rentPaid', width: 15, style: { numFmt: currencyFmt } },
  ];
  
  yearSheet.columns = yCols;
  yearSheet.getRow(1).font = headerFont;
  yearSheet.getRow(1).fill = headerFill;

  result.yearlyData.forEach(d => {
    yearSheet.addRow({
      year: d.year,
      homeValue: d.homeValue,
      mortgageBalance: d.mortgageBalance,
      equity: d.equity,
      buyPortfolio: d.buyScenarioPortfolio,
      rentPortfolio: d.rentScenarioPortfolio,
      buyNW: d.buyTotalNetWorth,
      rentNW: d.rentTotalNetWorth,
      intPaid: d.yearlyInterestPaid,
      prinPaid: d.yearlyPrincipalPaid,
      rentPaid: d.rentCost
    });
  });

  // --- SHEET 4: MONTHLY DATA ---
  const monthSheet = workbook.addWorksheet('Monthly Data');
  monthSheet.columns = [
    { header: 'Month', key: 'month', width: 10 },
    { header: 'Interest Paid', key: 'int', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Principal Paid', key: 'prin', width: 15, style: { numFmt: currencyFmt } },
    { header: 'Balance', key: 'bal', width: 15, style: { numFmt: currencyFmt } },
  ];
  monthSheet.getRow(1).font = headerFont;
  monthSheet.getRow(1).fill = headerFill;

  result.monthlyData.forEach(d => {
    monthSheet.addRow({
      month: d.month,
      int: d.interestPaid,
      prin: d.principalPaid,
      bal: d.balance
    });
  });

  // --- EXPORT ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Rent_vs_Buy_Analysis_${new Date().toISOString().slice(0,10)}.xlsx`);
};