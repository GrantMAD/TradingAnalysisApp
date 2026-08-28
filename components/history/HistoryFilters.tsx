"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Filter, X } from 'lucide-react';

export function HistoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const decision = searchParams.get('decision') || 'ALL';
  const timeframe = searchParams.get('timeframe') || 'ALL';
  const sort = searchParams.get('sort') || 'newest';

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'ALL' || !value) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      // Reset page when filters change
      if (name !== 'page') {
        params.delete('page');
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    router.push(pathname + '?' + createQueryString(key, value));
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = searchParams.get('decision') || searchParams.get('timeframe') || searchParams.get('sort');

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-end">
      <div className="flex items-center gap-2 mb-1 sm:mb-0 text-muted-foreground self-start sm:self-center mr-4">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
        <div className="space-y-2">
          <Label htmlFor="decision" className="text-xs text-muted-foreground uppercase tracking-wider">Decision</Label>
          <Select value={decision} onValueChange={(val) => handleFilterChange('decision', val as string)}>
            <SelectTrigger id="decision" className="w-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <SelectValue placeholder="All Decisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Decisions</SelectItem>
              <SelectItem value="LONG">LONG</SelectItem>
              <SelectItem value="SHORT">SHORT</SelectItem>
              <SelectItem value="NO_TRADE">NO_TRADE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeframe" className="text-xs text-muted-foreground uppercase tracking-wider">Timeframe</Label>
          <Select value={timeframe} onValueChange={(val) => handleFilterChange('timeframe', val as string)}>
            <SelectTrigger id="timeframe" className="w-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <SelectValue placeholder="All Timeframes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Timeframes</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort" className="text-xs text-muted-foreground uppercase tracking-wider">Sort By</Label>
          <Select value={sort} onValueChange={(val) => handleFilterChange('sort', val as string)}>
            <SelectTrigger id="sort" className="w-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="score_high">Highest Score</SelectItem>
              <SelectItem value="score_low">Lowest Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end pb-px">
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
