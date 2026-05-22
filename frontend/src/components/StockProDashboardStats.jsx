import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { ChartContainer, ChartTooltip } from './ui/line-charts-6';
import { Package, TrendingUp, AlertCircle, DollarSign, Building2, Users, Activity, Warehouse } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

/**
 * StockPro Dashboard Stats Component
 * Displays real overview metrics and a chart derived from live dashboard data.
 */

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatCurrency = (value, currencyCode = 'MAD') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const CustomTooltip = ({ active, payload, label, scope }) => {
  if (active && payload && payload.length) {
    const items = payload.filter((entry) => entry.value !== 0);

    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-md min-w-[180px]">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="space-y-1 text-sm">
          {items.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-400">{entry.name}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {scope === 'platform' && entry.dataKey === 'mrrCents'
                  ? formatCurrency(entry.value / 100, 'MAD')
                  : formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function buildTenantChartData(overview) {
  const movements = Array.isArray(overview?.recentMovements) ? overview.recentMovements : [];
  const grouped = new Map();

  movements.forEach((movement) => {
    const date = String(movement.createdAt || '').slice(0, 10);

    if (!date) {
      return;
    }

    const bucket = grouped.get(date) || {
      date,
      inbound: 0,
      outbound: 0,
      adjustments: 0,
    };

    if (movement.movementType === 'in') {
      bucket.inbound += Number(movement.quantity || 0);
    } else if (movement.movementType === 'out') {
      bucket.outbound += Number(movement.quantity || 0);
    } else {
      bucket.adjustments += Number(movement.quantity || 0);
    }

    grouped.set(date, bucket);
  });

  return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date));
}

function buildPlatformChartData(overview) {
  const companies = Array.isArray(overview?.recentCompanies) ? overview.recentCompanies : [];
  const grouped = new Map();

  companies.forEach((company) => {
    const date = String(company.createdAt || '').slice(0, 10);

    if (!date) {
      return;
    }

    const bucket = grouped.get(date) || {
      date,
      companiesCreated: 0,
      activeEmployees: 0,
    };

    bucket.companiesCreated += 1;
    bucket.activeEmployees += Number(company.activeEmployees || 0);

    grouped.set(date, bucket);
  });

  return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date));
}

function formatChartDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StockProDashboardStats({ overview }) {
  const scope = overview?.scope || 'tenant';

  const chartData = useMemo(() => {
    return scope === 'platform' ? buildPlatformChartData(overview) : buildTenantChartData(overview);
  }, [overview, scope]);

  const metrics = useMemo(() => {
    if (scope === 'platform') {
      return [
        {
          key: 'companies',
          label: 'Total Companies',
          value: overview?.metrics?.totalCompanies || 0,
          icon: Building2,
          format: formatNumber,
        },
        {
          key: 'activeCompanies',
          label: 'Active Companies',
          value: overview?.metrics?.activeCompanies || 0,
          icon: Warehouse,
          format: formatNumber,
        },
        {
          key: 'users',
          label: 'Active Users',
          value: overview?.metrics?.activeUsers || 0,
          icon: Users,
          format: formatNumber,
        },
        {
          key: 'mrrCents',
          label: 'MRR',
          value: overview?.metrics?.monthlyRecurringRevenueCents || 0,
          icon: DollarSign,
          format: (value) => formatCurrency(Number(value) / 100, 'MAD'),
        },
      ];
    }

    return [
      {
        key: 'employees',
        label: 'Active Employees',
        value: overview?.metrics?.activeEmployees || 0,
        icon: Users,
        format: formatNumber,
      },
      {
        key: 'products',
        label: 'Active Products',
        value: overview?.metrics?.activeProducts || 0,
        icon: Package,
        format: formatNumber,
      },
      {
        key: 'lowStock',
        label: 'Low Stock Products',
        value: overview?.metrics?.lowStockProducts || 0,
        icon: AlertCircle,
        format: formatNumber,
      },
      {
        key: 'value',
        label: 'Stock Value',
        value: overview?.metrics?.stockValue || 0,
        icon: DollarSign,
        format: (value) => formatCurrency(value, overview?.plan?.currencyCode || 'MAD'),
      },
    ];
  }, [overview, scope]);

  const chartSeries = scope === 'platform'
    ? [
        { key: 'companiesCreated', label: 'Companies created', color: '#3b82f6' },
        { key: 'activeEmployees', label: 'Active employees in recent companies', color: '#10b981' },
      ]
    : [
        { key: 'inbound', label: 'Inbound', color: '#10b981' },
        { key: 'outbound', label: 'Outbound', color: '#ef4444' },
        { key: 'adjustments', label: 'Adjustments', color: '#f59e0b' },
      ];

  const chartConfig = useMemo(() => {
    return Object.fromEntries(chartSeries.map((series) => [series.key, { label: series.label, color: series.color }]));
  }, [chartSeries]);

  if (!overview) {
    return null;
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader className="p-0 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 grow">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div
                  key={metric.key}
                  className={cn(
                    'flex-1 text-start p-4 last:border-b-0 border-b border-slate-200 dark:border-slate-700 md:border-b md:even:border-e md:dark:even:border-slate-700 lg:border-b-0 lg:border-e lg:dark:border-slate-700 lg:last:border-e-0 transition-all',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{metric.label}</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {metric.format(metric.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="px-2.5 py-6">
          <ChartContainer
            config={chartConfig}
            className="h-80 w-full overflow-visible [&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300 dark:[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-600"
          >
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                left: 5,
                bottom: 20,
              }}
              style={{ overflow: 'visible' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickMargin={10}
                tickFormatter={formatChartDate}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickMargin={10}
              />

              <ChartTooltip
                content={<CustomTooltip scope={scope} />}
                cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                labelFormatter={formatChartDate}
              />

              {chartSeries.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={true}
                  activeDot={{
                    r: 6,
                    fill: series.color,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
