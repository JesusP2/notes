import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EdgeType } from "@/db/schema/graph";

const EDGE_TYPE_OPTIONS: Array<{
  value: EdgeType;
  label: string;
  description: string;
}> = [
  {
    value: "references",
    label: "references",
    description: "Links to this note",
  },
  {
    value: "supports",
    label: "supports",
    description: "Provides evidence for",
  },
  { value: "contradicts", label: "contradicts", description: "Disagrees with" },
  {
    value: "related_to",
    label: "related to",
    description: "Is loosely related to",
  },
];

interface EdgeTypeSelectProps {
  value: EdgeType;
  onValueChange: (value: EdgeType) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EdgeTypeSelect({ value, onValueChange, open, onOpenChange }: EdgeTypeSelectProps) {
  const valueRef = useRef<EdgeType>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleValueChange = (nextValue: EdgeType | null) => {
    if (nextValue === null || valueRef.current === nextValue) {
      return;
    }
    valueRef.current = nextValue;
    onValueChange(nextValue);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="edge-type-select">Edge type</Label>
      <Select
        value={value}
        onValueChange={handleValueChange}
        open={open}
        onOpenChange={onOpenChange}
      >
        <SelectTrigger aria-label="Edge type" id="edge-type-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDGE_TYPE_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              onClick={() => handleValueChange(option.value)}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-muted-foreground text-[10px]">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { EDGE_TYPE_OPTIONS };
