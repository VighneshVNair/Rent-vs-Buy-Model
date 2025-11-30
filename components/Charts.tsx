import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { YearlyResult, MonthlyResult } from '../types';

interface ChartProps {
  data: YearlyResult[];
  id?: string;
}

interface MonthlyChartProps {
  data: MonthlyResult[];
  id?: string;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumSignificantDigits: 3 }).format(value);

export const NetWorthChart: React.FC<ChartProps> = ({ data, id }) => {
  return (
    <div className="h-80 w-full" id={id}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Net Worth Projection</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="year" 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
            dy={10}
          />
          <YAxis 
            tickFormatter={(val) => `€${val / 1000}k`} 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
          <Area 
            type="monotone" 
            dataKey="buyTotalNetWorth" 
            name="Buy: Net Worth" 
            stroke="#2563eb" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBuy)" 
          />
          <Area 
            type="monotone" 
            dataKey="rentTotalNetWorth" 
            name="Rent: Net Worth" 
            stroke="#0d9488" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRent)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EquityChart: React.FC<ChartProps> = ({ data, id }) => {
  return (
    <div className="h-80 w-full mt-8" id={id}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Asset Breakdown</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="year" 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
            dy={10}
          />
          <YAxis 
            tickFormatter={(val) => `€${val / 1000}k`} 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="plainline" wrapperStyle={{ paddingTop: '20px' }} />
          <Line type="monotone" dataKey="equity" name="Home Equity (Buy)" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="rentScenarioPortfolio" name="Inv. Portfolio (Rent)" stroke="#0d9488" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="buyScenarioPortfolio" name="Side Inv. (Buy)" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MortgageScheduleChart: React.FC<MonthlyChartProps> = ({ data, id }) => {
  return (
    <div className="h-80 w-full mt-8" id={id}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Mortgage Amortization Schedule (Monthly)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
            dy={10}
            tickFormatter={(month) => month % 12 === 0 ? `Year ${month / 12}` : ''}
            interval={0}
          />
          <YAxis 
            tickFormatter={(val) => `€${val}`} 
            axisLine={false}
            tickLine={false}
            tick={{fontSize: 12, fill: '#64748b'}}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => `Month ${label}`}
            cursor={{fill: '#f1f5f9'}}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="principalPaid" name="Principal Paid" stackId="a" fill="#2563eb" />
          <Bar dataKey="interestPaid" name="Interest Paid" stackId="a" fill="#94a3b8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};