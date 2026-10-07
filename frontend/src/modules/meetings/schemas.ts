import { z } from "zod";
import { CREATE_TABS, TITLE_MAX_LENGTH, type CreateTab } from "@/modules/meetings/constants";
import { localInputToIso, nowAsLocalInput } from "@/modules/meetings/datetime";
import { validateTranscriptFile } from "@/modules/meetings/upload-file";

const participantSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
});

const titleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title")
  .max(TITLE_MAX_LENGTH, `Keep the title under ${TITLE_MAX_LENGTH} characters`);

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

export type CreateMeetingFormValues = z.input<typeof createMeetingSchema>;
export type CreateMeetingFormOutput = z.output<typeof createMeetingSchema>;

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
