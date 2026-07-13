"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TagListEditorProps {
  label: string;
  description?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function TagListEditor({
  label,
  description,
  values,
  onChange,
  placeholder,
  maxItems = 10,
}: TagListEditorProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const descriptionId = useId();

  function addTag() {
    const trimmed = draft.trim();
    if (!trimmed || values.length >= maxItems) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <Input
        id={inputId}
        aria-describedby={description ? descriptionId : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
        disabled={values.length >= maxItems}
      />
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} selected`}>
          {values.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
