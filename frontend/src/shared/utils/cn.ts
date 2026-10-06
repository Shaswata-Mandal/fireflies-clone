// Merges conditional class names and resolves Tailwind conflicts (last one wins: "p-2 p-4" → "p-4").
// `cn` is shadcn's own package (github.com/shadcn-ui/cn), a drop-in for clsx + tailwind-merge.
export { cn } from "cn";
