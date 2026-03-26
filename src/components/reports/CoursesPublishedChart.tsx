import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BookCheck, BarChart3, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getChartInsights } from '@/lib/reports-utils';
import { renderInsight } from './InsightRenderer';

interface CoursesPublishedChartProps {
  data: any;
  coursesPublishedData: any[];
  period: string;
  getDynamicTitle: (chartType: string, selectedPeriod: string) => string;
  expandedInsights: Set<string>;
  toggleInsight: (insightType: string) => void;
  metrics?: any;
}

export const CoursesPublishedChart: React.FC<CoursesPublishedChartProps> = ({
  data,
  coursesPublishedData,
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
          <BookCheck className="w-5 h-5 text-blue-600" />
          {getDynamicTitle('coursesPublished', period)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.coursesPublishedData || coursesPublishedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="courses" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Expandable Insights */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full mt-4 justify-between p-3 h-auto text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
              onClick={() => toggleInsight('coursesPublished')}
            >
              <span className="flex items-center gap-2 font-medium">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                View Detailed Insights
              </span>
              {expandedInsights.has('coursesPublished') ?
                <ChevronDown className="w-4 h-4 text-blue-600" /> :
                <ChevronRight className="w-4 h-4 text-slate-400" />
              }
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {(() => {
              const insights = getChartInsights('coursesPublished', data?.coursesPublishedData || coursesPublishedData, metrics);
              return insights ? (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BookCheck className="w-5 h-5 text-blue-600" />
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