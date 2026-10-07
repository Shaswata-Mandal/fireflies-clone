"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { INPUT_CLASS, LABEL_CLASS } from "@/modules/meetings/components/form-classes";
import { useParticipants } from "@/modules/meetings/hooks";
import {
  addParticipant,
  formatParticipant,
  parseParticipantInput,
  participantKey,
} from "@/modules/meetings/participant-input";
import type { ParticipantDraft } from "@/modules/meetings/types";
import { fieldErrorId } from "@/shared/components/FormField";

interface ParticipantTagInputProps {
  id: string;
  value: ParticipantDraft[];
  onChange: (next: ParticipantDraft[]) => void;
  disabled?: boolean;
}

const MAX_SUGGESTIONS = 5;
const ADD_KEYS = new Set(["Enter", ","]);

/**
 * Tag-style participant field. Type "Name" or "Name <email>" and press Enter or comma (or leave the
 * field) to add a chip; Backspace on an empty field removes the last chip. Suggestions come from
 * people in the user's other meetings. Enter never submits the surrounding form.
 */
export function ParticipantTagInput({ id, value, onChange, disabled }: ParticipantTagInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setFocused] = useState(false);
  const { data: known = [] } = useParticipants();

  const query = text.trim().toLowerCase();
  const taken = new Set(value.map(participantKey));
  const suggestions = known
    .filter((person) => !taken.has(person.name.toLowerCase()))
    .filter((person) => `${person.name} ${person.email ?? ""}`.toLowerCase().includes(query))
    .slice(0, MAX_SUGGESTIONS);

  function add(draft: ParticipantDraft) {
    onChange(addParticipant(value, draft).list);
    setText("");
    setError(null);
  }

  /** Returns false (and shows why) when the text isn't a valid entry. */
  function commitText(): boolean {
    if (!text.trim()) return true;
    const result = parseParticipantInput(text);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    add(result.participant);
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (ADD_KEYS.has(event.key)) {
      event.preventDefault();
      commitText();
    } else if (event.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASS}>
        Participants
      </label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Added participants">
          {value.map((person) => (
            <li
              key={participantKey(person)}
              title={formatParticipant(person)}
              className="flex items-center gap-1 rounded-md bg-primary-subtle py-1 pr-1 pl-2 text-xs text-primary-fg"
            >
              {person.name}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${person.name}`}
                onClick={() => onChange(value.filter((other) => other !== person))}
                className="rounded-sm p-0.5 hover:bg-primary-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          id={id}
          value={text}
          disabled={disabled}
          placeholder="Name or Name <email@example.com>"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? fieldErrorId(id) : `${id}-hint`}
          className={INPUT_CLASS}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitText();
          }}
        />
        {isFocused && suggestions.length > 0 && (
          <ul
            aria-label="Suggestions"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-default bg-surface p-1 shadow-lg"
          >
            {suggestions.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  // mousedown (not click) so the input keeps focus and doesn't blur-commit first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    add({ name: person.name, email: person.email });
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-default hover:bg-hover"
                >
                  {person.name}
                  {person.email && <span className="text-xs text-muted">{person.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? (
        <p id={fieldErrorId(id)} role="alert" className="text-xs text-danger-fg">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted">
          Press Enter or comma to add. Speakers found in the transcript are added automatically.
        </p>
      )}
    </div>
  );
}
