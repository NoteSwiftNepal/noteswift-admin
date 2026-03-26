import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Helper function to render different types of insights
export const renderInsight = (insight: any, index: number): JSX.Element => {
  switch (insight.type) {
    case 'metric':
      return (
        <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
          <div className="text-blue-600 flex-shrink-0">{insight.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{insight.label}</div>
            <div className="text-sm text-slate-600">{insight.value}</div>
            {insight.subvalue && (
              <div className="text-xs text-slate-500 mt-0.5">{insight.subvalue}</div>
            )}
          </div>
        </div>
      );

    case 'highlight':
      return (
        <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-slate-50 border border-slate-300 hover:bg-white transition-colors duration-150">
          <div className="text-blue-600 flex-shrink-0">{insight.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{insight.label}</div>
            <div className="text-sm text-slate-700">{insight.value}</div>
            {insight.subvalue && (
              <div className="text-xs text-slate-600 mt-0.5">{insight.subvalue}</div>
            )}
          </div>
        </div>
      );

    case 'progress':
      return (
        <div key={index} className="p-3 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900">{insight.label}</span>
            <span className="text-sm font-medium text-slate-700">{insight.value}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-slate-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${insight.progress * 100}%` }}
            ></div>
          </div>
        </div>
      );

    case 'trend':
      const trendColor = insight.trend === 'positive' ? 'text-green-600' :
                        insight.trend === 'negative' ? 'text-red-600' : 'text-slate-600';
      const trendIcon = insight.trend === 'positive' ? <TrendingUp className="w-4 h-4" /> :
                       insight.trend === 'negative' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;

      return (
        <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
          <div className={`${trendColor} flex-shrink-0`}>{trendIcon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{insight.label}</div>
            <div className={`text-sm font-semibold ${trendColor}`}>{insight.value}</div>
            {insight.subvalue && (
              <div className="text-xs text-slate-500 mt-0.5">{insight.subvalue}</div>
            )}
          </div>
        </div>
      );

    case 'info':
      return (
        <div key={index} className="p-3 rounded-md bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors duration-150">
          <div className="text-sm font-medium text-slate-900 mb-1">{insight.label}</div>
          <div className="text-sm text-slate-700">{insight.value}</div>
          {insight.subvalue && (
            <div className="text-xs text-slate-600 mt-1.5 font-medium">{insight.subvalue}</div>
          )}
        </div>
      );

    default:
      return (
        <div key={index} className="flex items-start gap-3 p-3 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
          <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
          <span className="text-sm text-slate-700 leading-relaxed">
            {insight}
          </span>
        </div>
      );
  }
};