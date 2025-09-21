import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Volume2, 
  Headphones, 
  Radio, 
  Zap,
  HardDrive,
  Wifi,
  Settings
} from 'lucide-react';
import { useGlobalPlayer } from './GlobalPlayerProvider';
import { cn } from '@/lib/utils';

interface PlayerSettingsProps {
  className?: string;
}

export const PlayerSettings: React.FC<PlayerSettingsProps> = ({ className }) => {
  const { state, actions } = useGlobalPlayer();

  const qualityOptions = [
    { value: 'auto', label: 'Auto', description: 'Adapts to connection' },
    { value: 'high', label: 'High (320kbps)', description: 'Best quality' },
    { value: 'medium', label: 'Medium (192kbps)', description: 'Good quality' },
    { value: 'low', label: 'Low (96kbps)', description: 'Data saver' }
  ];

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-6 space-y-8">
        {/* Audio Quality */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Audio Quality</h3>
              <p className="text-sm text-muted-foreground">
                Higher quality uses more bandwidth
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality">Quality</Label>
            <Select 
              value={state.quality} 
              onValueChange={(value: any) => actions.setQuality(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Playback */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Playback</h3>
              <p className="text-sm text-muted-foreground">
                Customize your listening experience
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gapless Playback</Label>
                <p className="text-sm text-muted-foreground">
                  Seamless transitions between tracks
                </p>
              </div>
              <Switch
                checked={state.gaplessEnabled}
                onCheckedChange={actions.setGapless}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Crossfade</Label>
                <p className="text-sm text-muted-foreground">
                  Fade between tracks for smooth transitions
                </p>
              </div>
              <Switch
                checked={state.crossfadeEnabled}
                onCheckedChange={actions.setCrossfade}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Performance</h3>
              <p className="text-sm text-muted-foreground">
                Optimize for your device and connection
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hardware Acceleration</Label>
                <p className="text-sm text-muted-foreground">
                  Use device hardware for better performance
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audio Preprocessing</Label>
                <p className="text-sm text-muted-foreground">
                  Loudness normalization and audio enhancement
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <Separator />

        {/* Storage & Cache */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Storage & Cache</h3>
              <p className="text-sm text-muted-foreground">
                Manage offline content and cache
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Cache Size</span>
                <span className="text-sm text-muted-foreground">2.3 GB</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>2.3 GB used</span>
                <span>5 GB limit</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-cache Liked Tracks</Label>
                <p className="text-sm text-muted-foreground">
                  Cache your liked tracks for offline playback
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Button variant="outline" className="w-full">
              Clear Cache
            </Button>
          </div>
        </div>

        <Separator />

        {/* Network */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Network</h3>
              <p className="text-sm text-muted-foreground">
                Connection and streaming settings
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stream on Cellular</Label>
                <p className="text-sm text-muted-foreground">
                  Allow streaming over mobile data
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Download on Cellular</Label>
                <p className="text-sm text-muted-foreground">
                  Allow downloads over mobile data
                </p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label>Cellular Quality</Label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (96kbps) - Data Saver</SelectItem>
                  <SelectItem value="medium">Medium (192kbps)</SelectItem>
                  <SelectItem value="high">High (320kbps)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Advanced */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Advanced</h3>
              <p className="text-sm text-muted-foreground">
                Expert audio settings
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Output Device</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System Default</SelectItem>
                  <SelectItem value="speakers">Built-in Speakers</SelectItem>
                  <SelectItem value="headphones">Headphones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sample Rate</Label>
              <Select defaultValue="auto">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="44100">44.1 kHz</SelectItem>
                  <SelectItem value="48000">48 kHz</SelectItem>
                  <SelectItem value="96000">96 kHz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Exclusive Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Bypass system mixer for better quality
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};