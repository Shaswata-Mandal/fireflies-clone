/**
 * zod validation schemas for the create and edit meeting forms.
 *
 * WHAT: Describes valid form values and the error messages shown under each field.
 * LAYER: Module schemas (client-side validation; the backend validates again).
 * CALLED BY: `CreateMeetingForm` and `EditMeetingForm` through react-hook-form's `zodResolver`.
 * CALLS: zod, `constants.ts`, `datetime.ts`, `upload-file.ts`.
 * MERN EQUIVALENT: a Yup/Joi schema passed to Formik, or zod with react-hook-form.
 * INTERVIEW: client validation is for fast feedback only; the server is the source of truth.
 */

import { z } from "zod";
import { CREATE_TABS, TITLE_MAX_LENGTH, type CreateTab } from "@/modules/meetings/constants";
import { localInputToIso, nowAsLocalInput } from "@/modules/meetings/datetime";
import { validateTranscriptFile } from "@/modules/meetings/upload-file";

const participantSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
});

// Schemas are small composable pieces: this one is reused by both the create and edit forms.
const titleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title")
  .max(TITLE_MAX_LENGTH, `Keep the title under ${TITLE_MAX_LENGTH} characters`);

// `refine` adds a custom rule: the string must convert to a real date.
const meetingDateSchema = z
  .string()
  .refine((value) => localInputToIso(value) !== null, "Enter a valid date and time");

const transcriptFormatSchema = z.enum(["txt", "vtt", "json"]);

/**
 * Create form. One object holds every tab's fields (react-hook-form keeps them when the user
 * switches tabs), and `superRefine` requires only the ones the active tab needs:
 * upload → a valid file, paste → transcript text, manual → nothing extra.
 */
export const createMeetingSchema = z
  .object({
    tab: z.enum([CREATE_TABS.UPLOAD, CREATE_TABS.PASTE, CREATE_TABS.MANUAL]),
    title: titleSchema,
    /** `datetime-local` value (local time, no zone). Converted to UTC ISO on submit. */
    meeting_date: meetingDateSchema,
    participants: z.array(participantSchema),
    generate_summary: z.boolean(),
    file: z.custom<File | null>((value) => value === null || value instanceof File),
    transcript_text: z.string(),
    transcript_format: transcriptFormatSchema,
  })
  .superRefine((values, context) => {
    if (values.tab === CREATE_TABS.UPLOAD) {
      const problem = values.file ? validateTranscriptFile(values.file) : "Choose a file to upload";
      if (problem) context.addIssue({ code: "custom", path: ["file"], message: problem });
    }
    if (values.tab === CREATE_TABS.PASTE && !values.transcript_text.trim()) {
      context.addIssue({
        code: "custom",
        path: ["transcript_text"],
        message: "Paste the transcript text",
      });
    }
  });

// `z.input` = the shape the form holds while typing; `z.output` = the shape after validation
// (they differ when a schema transforms values, such as `.trim()`).
export type CreateMeetingFormValues = z.input<typeof createMeetingSchema>;
export type CreateMeetingFormOutput = z.output<typeof createMeetingSchema>;

/**
 * Fresh default values for the create form.
 * @param tab which tab starts selected (defaults to Upload)
 */
export function emptyCreateMeetingValues(
  tab: CreateTab = CREATE_TABS.UPLOAD,
): CreateMeetingFormValues {
  return {
    tab,
    title: "",
    meeting_date: nowAsLocalInput(),
    participants: [],
    generate_summary: true,
    file: null,
    transcript_text: "",
    transcript_format: "txt",
  };
}

/** Edit form: the same three common fields, nothing transcript-related. */
export const editMeetingSchema = z.object({
  title: titleSchema,
  meeting_date: meetingDateSchema,
  participants: z.array(participantSchema),
});

export type EditMeetingFormValues = z.input<typeof editMeetingSchema>;
export type EditMeetingFormOutput = z.output<typeof editMeetingSchema>;
