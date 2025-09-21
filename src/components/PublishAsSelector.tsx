import React from "react";
import { useStudioContext } from "@/contexts/StudioContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building, User, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type PublishAsOption = {
  type: 'user' | 'label';
  id: string;
  name: string;
  avatar?: string;
  isDefault?: boolean;
};

interface PublishAsSelectorProps {
  value?: PublishAsOption;
  onChange: (option: PublishAsOption) => void;
  className?: string;
  disabled?: boolean;
  showDescription?: boolean;
}

export function PublishAsSelector({
  value,
  onChange,
  className,
  disabled = false,
  showDescription = true
}: PublishAsSelectorProps) {
  const { user } = useAuth();
  const studioContext = useStudioContext();
  const { mode, activeLabel, memberships } = studioContext;

  // Build available options
  const options = React.useMemo<PublishAsOption[]>(() => {
    const opts: PublishAsOption[] = [];

    // Add personal profile option
    if (user) {
      opts.push({
        type: 'user',
        id: user.id, // This should be profile.id in production
        name: 'Personal Profile',
        avatar: user.user_metadata?.avatar_url,
        isDefault: mode === 'personal'
      });
    }

    // Add label options where user has permission to publish
    memberships
      .filter(m => m.role === 'owner' || m.role === 'admin' || m.role === 'editor')
      .forEach(membership => {
        opts.push({
          type: 'label',
          id: membership.id,
          name: membership.name || membership.slug || 'Label',
          avatar: membership.logo_url || undefined,
          isDefault: mode === 'label' && activeLabel?.id === membership.id
        });
      });

    return opts;
  }, [user, memberships, mode, activeLabel]);

  // Set default value if not provided
  React.useEffect(() => {
    if (!value && options.length > 0) {
      const defaultOption = options.find(opt => opt.isDefault) || options[0];
      onChange(defaultOption);
    }
  }, [value, options, onChange]);

  if (options.length === 0) {
    return null;
  }

  // If only one option, show as read-only
  if (options.length === 1) {
    const option = options[0];
    return (
      <div className={cn("space-y-2", className)}>
        {showDescription && (
          <Label className="text-sm font-medium">Publishing as</Label>
        )}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={option.avatar} />
            <AvatarFallback>
              {option.type === 'label' ? (
                <Building className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{option.name}</div>
            {showDescription && (
              <div className="text-xs text-muted-foreground">
                {option.type === 'label' ? 'Label account' : 'Personal account'}
              </div>
            )}
          </div>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const selectedValue = value ? `${value.type}:${value.id}` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {showDescription && (
        <Label className="text-sm font-medium">Publish as</Label>
      )}

      <RadioGroup
        value={selectedValue}
        onValueChange={(val) => {
          const [type, id] = val.split(':');
          const option = options.find(
            opt => opt.type === type && opt.id === id
          );
          if (option) {
            onChange(option);
          }
        }}
        disabled={disabled}
        className="space-y-2"
      >
        {options.map((option) => {
          const optionValue = `${option.type}:${option.id}`;
          const isSelected = selectedValue === optionValue;

          return (
            <label
              key={optionValue}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <RadioGroupItem
                value={optionValue}
                disabled={disabled}
                className="sr-only"
              />

              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={option.avatar} />
                  <AvatarFallback>
                    {option.type === 'label' ? (
                      <Building className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{option.name}</div>
                {showDescription && (
                  <div className="text-xs text-muted-foreground">
                    {option.type === 'label' ? 'Label account' : 'Personal account'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {option.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
                {option.type === 'label' && (
                  <Badge variant="outline" className="text-xs">
                    Label
                  </Badge>
                )}
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {showDescription && (
        <p className="text-xs text-muted-foreground">
          Choose which account this content will be published under. This affects visibility and revenue attribution.
        </p>
      )}
    </div>
  );
}

// Hook for using publish-as in forms
export function usePublishAs() {
  const [publishAs, setPublishAs] = React.useState<PublishAsOption | undefined>();

  const getOwnerData = () => {
    if (!publishAs) return { owner_type: null, owner_id: null };
    return {
      owner_type: publishAs.type,
      owner_id: publishAs.id
    };
  };

  return {
    publishAs,
    setPublishAs,
    getOwnerData
  };
}