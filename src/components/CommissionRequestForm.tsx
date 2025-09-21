
import React, { useMemo, useState } from "react";
import { useCommissionRequests } from "@/hooks/useCommissionRequests";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Props = {
  producerId: string;
  defaultGenre?: string;
};

export const CommissionRequestForm: React.FC<Props> = ({ producerId, defaultGenre }) => {
  const { toast } = useToast();
  const { createRequest } = useCommissionRequests();

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState(defaultGenre || "");
  const [description, setDescription] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [budget, setBudget] = useState<string>(""); // major units
  const [deadline, setDeadline] = useState<string>("");

  const disabled = useMemo(() => {
    const amount = Number(budget);
    return !producerId || title.trim().length < 3 || !Number.isFinite(amount) || amount <= 0;
  }, [producerId, title, budget]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(budget);
    const refs = referenceLinks
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error } = await createRequest({
      producerId,
      title,
      description,
      genre,
      referenceLinks: refs,
      budgetAmount: amount,
      deadline: deadline || undefined,
    });

    if (error) {
      toast({
        title: "Could not submit commission",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Commission request sent",
      description: "The producer has been notified.",
    });

    // Reset
    setTitle("");
    setGenre(defaultGenre || "");
    setDescription("");
    setReferenceLinks("");
    setBudget("");
    setDeadline("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Request a custom beat</CardTitle>
        <CardDescription>Describe what you need and propose a budget.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Dark trap beat with ambient textures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              placeholder="e.g. Trap, Drill, RnB"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Share details, mood, BPM range, references..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="refs">Reference links (one per line)</Label>
            <Textarea
              id="refs"
              placeholder="Paste YouTube/Spotify/SoundCloud links, etc."
              value={referenceLinks}
              onChange={(e) => setReferenceLinks(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="budget">Proposed budget</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                placeholder="100.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={disabled}>
              Send request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommissionRequestForm;
