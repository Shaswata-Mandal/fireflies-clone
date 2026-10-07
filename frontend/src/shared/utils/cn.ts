/**
 * `cn()` class-name helper.
 *
 * WHAT: Joins class names and removes Tailwind conflicts (the shadcn/ui standard helper).
 * LAYER: Shared util.
 * CALLED BY: nearly every component with conditional or overridable Tailwind classes.
 * CALLS: the `cn` package.
 * MERN EQUIVALENT: the `classnames` / `clsx` package.
 */

// Merges conditional class names and resolves Tailwind conflicts (last one wins: "p-2 p-4" → "p-4").
// `cn` is shadcn's own package (github.com/shadcn-ui/cn), a drop-in for clsx + tailwind-merge.
export { cn } from "cn";
