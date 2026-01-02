import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { Node } from "@/db/schema/graph";
import { useSearchNodes } from "@/lib/graph-hooks";

interface NodeSearchProps {
  selectedId?: string | null;
  excludeId?: string;
  onSelect: (node: Node) => void;
  placeholder?: string;
}

export function NodeSearch({
  selectedId,
  excludeId,
  onSelect,
  placeholder = "Search notes...",
}: NodeSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useSearchNodes(query);

  const notes = useMemo(
    () => results.filter((node) => node.type === "note" && node.id !== excludeId),
    [excludeId, results],
  );

  const handleSelect = (nodeId: string | null) => {
    if (!nodeId) {
      return;
    }
    const match = notes.find((node) => node.id === nodeId);
    if (!match) {
      return;
    }
    onSelect(match);
    setQuery("");
    setOpen(false);
  };

  return (
    <Combobox
      value={selectedId ?? ""}
      onValueChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
    >
      <ComboboxInput
        aria-label="Search notes"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        value={query}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No notes found.</ComboboxEmpty>
          {notes.map((node) => (
            <ComboboxItem key={node.id} value={node.id}>
              {node.title}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
