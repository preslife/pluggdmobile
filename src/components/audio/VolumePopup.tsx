import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface VolumePopupProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
}

export const VolumePopup: React.FC<VolumePopupProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="w-8 h-8"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-12 p-2" align="center" side="top">
        <div className="flex flex-col items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleMute}
            className="w-8 h-8"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3 h-3" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
          </Button>
          <div className="h-20 flex items-center">
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={onVolumeChange}
              max={100}
              step={1}
              orientation="vertical"
              className="h-16"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(isMuted ? 0 : volume)}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
};