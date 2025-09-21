import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { usePlugAutomation, type PlugSchedule } from '@/hooks/usePlugAutomation';
import { CreateAutomationModal } from '@/components/CreateAutomationModal';

export const PlugAutomationList = () => {
  const { schedules, loading, toggleSchedule, deleteSchedule } = usePlugAutomation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getAutomationTypeLabel = (type: string) => {
    switch (type) {
      case 'scheduled_post':
        return 'Scheduled Post';
      case 'auto_reply':
        return 'Auto Reply';
      case 'smart_drop':
        return 'Smart Drop';
      default:
        return type;
    }
  };

  const getAutomationTypeBadge = (type: string) => {
    const variant = type === 'scheduled_post' ? 'default' : 
                   type === 'auto_reply' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{getAutomationTypeLabel(type)}</Badge>;
  };

  const formatNextRun = (nextRunAt: string | null) => {
    if (!nextRunAt) return 'One-time';
    return new Date(nextRunAt).toLocaleString();
  };

  if (loading) {
    return <div>Loading automations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">PLUG Automations</h2>
          <p className="text-muted-foreground">
            Automate your content and engagement with smart scheduling
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation to start engaging with your audience automatically
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{schedule.title}</CardTitle>
                  {getAutomationTypeBadge(schedule.automation_type)}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.is_enabled}
                    onCheckedChange={(enabled) => toggleSchedule(schedule.id, enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next run:</span>
                    <span>{formatNextRun(schedule.next_run_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={schedule.is_enabled ? 'text-green-600' : 'text-gray-500'}>
                      {schedule.is_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAutomationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};