import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, BarChart3, ChevronDown, ChevronRight, TrendingDown, Minus } from 'lucide-react';
import { getChartInsights } from '@/lib/reports-utils';
import { renderInsight } from './InsightRenderer';

interface UserGrowthChartProps {
  data: any;
  userGrowthData: any[];
  period: string;
  getDynamicTitle: (chartType: string, selectedPeriod: string) => string;
  expandedInsights: Set<string>;
  toggleInsight: (insightType: string) => void;
  metrics?: any;
}

export const UserGrowthChart: React.FC<UserGrowthChartProps> = ({
  data,
  userGrowthData,
  period,
  getDynamicTitle,
  expandedInsights,
  toggleInsight,
  metrics
}) => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {getDynamicTitle('userGrowth', period)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.userGrowthData || userGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="newUsers"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#userGrowth)"
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
              className="w-full mt-6 justify-between h-10 text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-md transition-all duration-200 hover:border-blue-300"
              onClick={() => toggleInsight('userGrowth')}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                View Insights
              </span>
              {expandedInsights.has('userGrowth') ?
                <ChevronDown className="w-4 h-4 text-blue-600" /> :
                <ChevronRight className="w-4 h-4 text-slate-400" />
              }
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {(() => {
              const insights = getChartInsights('userGrowth', data?.userGrowthData || userGrowthData, metrics);
              return insights ? (
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-slate-900 text-sm">
                      {insights.title}
                    </h4>
                  </div>

                  {/* Key Metric */}
                  {insights.keyMetric && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium text-slate-900">{insights.keyMetric.value}</div>
                          <div className="text-xs text-slate-600">{insights.keyMetric.label}</div>
                        </div>
                        <div className="flex items-center">
                          {insights.keyMetric.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                          ) : insights.keyMetric.trend === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <Minus className="w-4 h-4 text-slate-500" />
                          )}
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