"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { INPUT_CLASS, TEXTAREA_CLASS } from "@/modules/meetings/components/form-classes";
import { FORM_COPY, TRANSCRIPT_EXTENSIONS } from "@/modules/meetings/constants";
import { FormField, fieldErrorId } from "@/shared/components/FormField";

interface PasteTranscriptFieldsProps {
  idPrefix: string;
  formatField: UseFormRegisterReturn;
  textField: UseFormRegisterReturn;
  /** Client validation or server message (parse error with its line number, empty transcript). */
  textError?: string;
}

/** Format selector + textarea for pasting a transcript; the hint shows the expected txt shape. */
export function PasteTranscriptFields({
  idPrefix,
  formatField,
  textField,
  textError,
}: PasteTranscriptFieldsProps) {
  const formatId = `${idPrefix}-format`;
  const textId = `${idPrefix}-transcript`;

  return (
    <div className="flex flex-col gap-4">
      <FormField htmlFor={formatId} label="Format" className="sm:w-40">
        <select id={formatId} className={INPUT_CLASS} {...formatField}>
          {TRANSCRIPT_EXTENSIONS.map((format) => (
            <option key={format} value={format}>
              .{format}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        htmlFor={textId}
        label="Transcript"
        error={textError}
        hint={FORM_COPY.TRANSCRIPT_HINT}
      >
        <textarea
          id={textId}
          placeholder={FORM_COPY.TRANSCRIPT_PLACEHOLDER}
          spellCheck={false}
          aria-invalid={Boolean(textError)}
          aria-describedby={textError ? fieldErrorId(textId) : undefined}
          className={TEXTAREA_CLASS}
          {...textField}
        />
      </FormField>
    </div>
  );
}
