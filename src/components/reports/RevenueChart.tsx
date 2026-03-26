import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, BarChart3, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getChartInsights, formatCurrency } from '@/lib/reports-utils';
import { renderInsight } from './InsightRenderer';

interface RevenueChartProps {
  data: any;
  revenueTrendData: any[];
  period: string;
  getDynamicTitle: (chartType: string, selectedPeriod: string) => string;
  expandedInsights: Set<string>;
  toggleInsight: (insightType: string) => void;
  metrics?: any;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  revenueTrendData,
  period,
  getDynamicTitle,
  expandedInsights,
  toggleInsight,
  metrics
}) => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          {getDynamicTitle('revenue', period)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.revenueTrendData || revenueTrendData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => {
                if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                return [value, name];
              }} />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#revenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Expandable Insights */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full mt-4 justify-between p-3 h-auto text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
              onClick={() => toggleInsight('revenue')}
            >
              <span className="flex items-center gap-2 font-medium">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                View Detailed Insights
              </span>
              {expandedInsights.has('revenue') ?
                <ChevronDown className="w-4 h-4 text-blue-600" /> :
                <ChevronRight className="w-4 h-4 text-slate-400" />
              }
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {(() => {
              const insights = getChartInsights('revenue', data?.revenueTrendData || revenueTrendData, metrics);
              return insights ? (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-base">
                      {insights.title}
                    </h4>
                  </div>

                  {/* Key Metric */}
                  {insights.keyMetric && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-slate-900">{insights.keyMetric.value}</div>
                          <div className="text-sm text-slate-700">{insights.keyMetric.label}</div>
                        </div>
                        <div className="text-2xl">
                          {insights.keyMetric.trend === 'up' ? <TrendingUp className="w-6 h-6 text-blue-600" /> :
                           insights.keyMetric.trend === 'down' ? <TrendingDown className="w-6 h-6 text-red-500" /> : <Minus className="w-6 h-6 text-slate-500" />}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  <div className="space-y-2">
                    {insights.insights.map((insight, index) => renderInsight(insight, index))}
                  </div>
                </div>
              ) : null;
            })()}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};