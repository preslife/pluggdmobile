import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus, Play, Heart, Share2, MoreHorizontal } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

interface ChartItem {
  id: string;
  title: string;
  artist_name: string;
  artist_username: string;
  cover_url?: string;
  audio_url?: string;
  current_position: number;
  previous_position?: number;
  weeks_on_chart: number;
  peak_position: number;
  plays_count: number;
  likes_count: number;
  bpm?: number;
  genre?: string;
  price?: number;
  created_at: string;
}

interface TrendingChartsProps {
  chartType: 'all' | 'beats' | 'music' | 'genres';
  genre?: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export const TrendingCharts: React.FC<TrendingChartsProps> = ({
  chartType = 'all',
  genre,
  timeframe = 'weekly',
  limit = 50,
  showHeader = true,
  className
}) => {
  const [chartItems, setChartItems] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [chartType, genre, timeframe]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chart_items')
        .select(`
          id, title, artist_name, artist_username, cover_url, audio_url,
          current_position, previous_position, weeks_on_chart, peak_position,
          plays_count, likes_count, bpm, genre, price, created_at
        `)
        .eq('timeframe', timeframe)
        .order('current_position', { ascending: true })
        .limit(limit);

      if (chartType === 'beats') {
        query = query.eq('item_type', 'beat');
      } else if (chartType === 'music') {
        query = query.eq('item_type', 'release');
      }

      if (genre) {
        query = query.eq('genre', genre);
      }

      const { data, error } = await query;

      if (error) throw error;

      setChartItems(data || []);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getPositionChange = (current: number, previous?: number) => {
    if (!previous) return { type: 'new', change: 0 };
    if (current < previous) return { type: 'up', change: previous - current };
    if (current > previous) return { type: 'down', change: current - previous };
    return { type: 'same', change: 0 };
  };

  const getPositionIcon = (type: string, change: number) => {
    switch (type) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'new':
        return <Badge variant="secondary" className="text-xs px-1 py-0">NEW</Badge>;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'beats':
        return 'Trending Beats';
      case 'music':
        return 'Trending Music';
      case 'genres':
        return genre ? `${genre} Charts` : 'Genre Charts';
      default:
        return 'Trending Now';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>{getChartTitle()}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{getChartTitle()}</CardTitle>
            <Badge variant="outline" className="capitalize">
              {timeframe}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="space-y-0">
          {chartItems.map((item, index) => {
            const positionChange = getPositionChange(item.current_position, item.previous_position);
            const isSelected = selectedItem === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0",
                  isSelected && "bg-blue-50"
                )}
                onClick={() => setSelectedItem(isSelected ? null : item.id)}
              >
                {/* Position */}
                <div className="flex items-center gap-2 w-12">
                  <span className={cn(
                    "font-bold text-lg",
                    item.current_position <= 3 && "text-yellow-600",
                    item.current_position <= 10 && item.current_position > 3 && "text-blue-600"
                  )}>
                    {item.current_position}
                  </span>
                </div>

                {/* Position Change */}
                <div className="flex items-center gap-1 w-12">
                  {getPositionIcon(positionChange.type, positionChange.change)}
                  {positionChange.type !== 'new' && positionChange.type !== 'same' && (
                    <span className={cn(
                      "text-xs font-medium",
                      positionChange.type === 'up' && "text-green-600",
                      positionChange.type === 'down' && "text-red-600"
                    )}>
                      {positionChange.change}
                    </span>
                  )}
                </div>

                {/* Artwork */}
                <div className="relative">
                  <img
                    src={item.cover_url || '/api/placeholder/48/48'}
                    alt={item.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <Button
                    size="sm"
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle play
                    }}
                  >
                    <Play className="h-4 w-4 text-white" />
                  </Button>
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-600 truncate">
                    by {item.artist_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.bpm && (
                      <Badge variant="outline" className="text-xs">
                        {item.bpm} BPM
                      </Badge>
                    )}
                    {item.genre && (
                      <Badge variant="outline" className="text-xs">
                        {item.genre}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {item.weeks_on_chart} {item.weeks_on_chart === 1 ? 'week' : 'weeks'} on chart
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {formatNumber(item.plays_count)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(item.likes_count)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Peak: #{item.peak_position}
                  </div>
                </div>

                {/* Price */}
                {item.price && (
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${item.price}
                    </div>
                  </div>
                )}

                {/* More Actions */}
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {chartItems.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            <p>No chart data available for this timeframe.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};