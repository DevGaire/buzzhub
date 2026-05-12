import { z } from "zod";

const requiredString = z.string().trim().min(1, "Required");

export const signUpSchema = z.object({
  email: requiredString.email("Invalid email address"),
  username: requiredString.regex(
    /^[a-zA-Z0-9_-]+$/,
    "Only letters, numbers, - and _ allowed",
  ),
  password: requiredString.min(8, "Must be at least 8 characters"),
  // Age gate: must be true. We don't store DOB — just record that the user
  // affirmed they're ≥13 at the time of signup.
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must be at least 13 to sign up" }),
  }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  username: requiredString,
  password: requiredString,
});

export type LoginValues = z.infer<typeof loginSchema>;

export const postVisibilitySchema = z.enum(["public", "followers", "only_me"]);

export const postStatusSchema = z.enum(["draft", "published", "scheduled"]);

export const createPostSchema = z.object({
  content: requiredString,
  mediaIds: z.array(z.string()).max(5, "Cannot have more than 5 attachments"),
  visibility: postVisibilitySchema.default("public"),
  status: postStatusSchema.default("published"),
  // ISO-8601 string; the action parses it and clamps to a sane window.
  scheduledFor: z.string().datetime().optional(),
});

export const updatePostSchema = z.object({
  content: requiredString,
  visibility: postVisibilitySchema.optional(),
  archived: z.boolean().optional(),
});

export const updateUserProfileSchema = z.object({
  displayName: requiredString,
  bio: z.string().max(1000, "Must be at most 1000 characters"),
});

export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;

export const createCommentSchema = z.object({
  content: requiredString,
});

export const updateCommentSchema = z.object({
  content: requiredString,
});

export const forgotPasswordSchema = z.object({
  email: requiredString.email("Invalid email address"),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: requiredString.min(8, "Must be at least 8 characters"),
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const createStorySchema = z.object({
  mediaIds: z.array(z.string()).min(1, "At least one media file is required").max(10, "Cannot have more than 10 media files"),
});

export type CreateStoryValues = z.infer<typeof createStorySchema>;
