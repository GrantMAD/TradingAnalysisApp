"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryAnalysis } from './types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ArrowRight, BarChart2, Clock, GitCompare } from 'lucide-react';
import { Badge } from '../ui/badge';
import { DecisionBadge } from '../analysis/DecisionBadge';

interface HistoryListProps {
  initialAnalyses: HistoryAnalysis[];
  totalCount: number;
  currentPage: number;
}

export function HistoryList({ initialAnalyses, totalCount, currentPage }: HistoryListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      if (checked) {
        if (prev.length >= 2) {
          // Keep the last selected and add new one
          return [prev[1], id];
        }
        return [...prev, id];
      } else {
        return prev.filter(selectedId => selectedId !== id);
      }
    });
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      router.push(`/history/compare?id1=${selectedIds[0]}&id2=${selectedIds[1]}`);
    }
  };

  const totalPages = Math.ceil(totalCount / 20);

  if (!initialAnalyses || initialAnalyses.length === 0) {
    return (
      <div className="glass flex min-h-75 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-muted-foreground mb-4">
          <BarChart2 className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No analyses found</h3>
        <p className="text-muted-foreground max-w-sm">
          We couldn&apos;t find any historical analyses matching your current filters. Try adjusting them or run a new analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      <div className="grid gap-4">
        {initialAnalyses.map((analysis) => {
          const isSelected = selectedIds.includes(analysis.id);
          return (
            <div 
              key={analysis.id} 
              className={`glass p-5 rounded-xl border transition-all duration-200 group flex flex-col md:flex-row items-start md:items-center gap-4 ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.15)] bg-primary/5' : 'border-border/50 hover:border-border hover:shadow-md hover:-translate-y-0.5'}`}
            >
              {/* Checkbox for Compare */}
              <div className="shrink-0 pt-1 md:pt-0">
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={(c: boolean | string) => handleSelect(analysis.id, !!c)}
                  aria-label="Select for comparison"
                  className="w-5 h-5 data-[state=checked]:bg-primary"
                />
              </div>

              {/* Core Info */}
              <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center w-full">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold">{analysis.instrument?.symbol.split('/')[0] || '---'}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{analysis.timeframe}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-lg leading-tight">{analysis.instrument?.symbol || 'Unknown'}</h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* Status / Decision */}
                <div className="flex-1 flex flex-wrap items-center gap-3 w-full">
                  {analysis.status !== 'completed' ? (
                    <Badge variant="outline" className="text-muted-foreground uppercase text-[10px] tracking-wider">
                      {analysis.status}
                    </Badge>
                  ) : (
                    <>
                      {/* Note: Fallback inline badge if DecisionBadge isn't perfectly structured for this list */}
                      <DecisionBadge decision={analysis.decision || 'NO_TRADE'} />
                      
                      {analysis.decision !== 'NO_TRADE' && analysis.setup_score !== null && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 border border-border/50">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Score</span>
                          <span className={`text-sm font-bold ${analysis.setup_score >= 80 ? 'text-green-500' : analysis.setup_score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                            {analysis.setup_score}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-2 flex w-full shrink-0 justify-end md:mt-0 md:w-auto">
                <Link href={`/history/${analysis.id}`} className="w-full md:w-auto">
                  <Button 
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button 
            variant="outline" 
            disabled={currentPage <= 1}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', (currentPage - 1).toString());
              router.push(`?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            disabled={currentPage >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', (currentPage + 1).toString());
              router.push(`?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Floating Compare Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="glass shadow-2xl rounded-full border border-primary/20 px-6 py-4 flex items-center gap-6 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-medium">Selected for comparison</span>
            </div>
            
            <Button 
              onClick={handleCompare} 
              disabled={selectedIds.length !== 2}
              className={`rounded-full shadow-lg ${selectedIds.length === 2 ? 'bg-primary hover:bg-primary/90 animate-pulse-subtle' : ''}`}
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Compare Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
