import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Edit, Eye, Trophy } from "lucide-react";
import { useBattles } from "@/hooks/useBattles";
import SEOHelmet from "@/components/SEOHelmet";
import { CreateBattleModal } from "@/components/live/CreateBattleModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminBattles = () => {
  const { battles, loading, refetch } = useBattles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'live': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'finished': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const updateBattleStatus = async (battleId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('battles')
        .update({ status })
        .eq('id', battleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Battle status updated to ${status}`
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating battle status:', error);
      toast({
        title: "Error",
        description: "Failed to update battle status",
        variant: "destructive"
      });
    }
  };

  const toggleFeatured = async (battleId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('battles')
        .update({ is_featured: !currentFeatured })
        .eq('id', battleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: currentFeatured ? "Battle unfeatured" : "Battle featured"
      });
      
      refetch();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <SEOHelmet 
        config={{
          title: "Admin - Battles Management",
          description: "Manage beat battles, update status, and feature battles"
        }}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Battles Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage beat battles
          </p>
        </div>
        
        <Button onClick={() => setShowCreateModal(true)}>
          Create Battle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Battles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {battles.map((battle) => (
                  <TableRow key={battle.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {battle.title}
                        {battle.is_featured && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(battle.status)}>
                        {battle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(battle.starts_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(battle.ends_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={battle.is_featured}
                        onCheckedChange={() => toggleFeatured(battle.id, battle.is_featured)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/live/battles/${battle.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {battle.status === 'upcoming' && (
                          <Button
                            size="sm"
                            onClick={() => updateBattleStatus(battle.id, 'live')}
                          >
                            Start
                          </Button>
                        )}
                        
                        {battle.status === 'live' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBattleStatus(battle.id, 'finished')}
                          >
                            End
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateBattleModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default AdminBattles;