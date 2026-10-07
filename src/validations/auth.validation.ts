import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_.]+$/, 'Only lowercase letters, numbers, dot and underscore')
  .refine((v) => !/^[._]|[._]$/.test(v), 'Username cannot start or end with . or _');

const base = {
  email: z.email('Enter a valid email').trim().toLowerCase().max(255),
  password: passwordSchema,
  fullName: z.string().trim().min(2, 'Name is too short').max(120),
};

export const registerSchema = z.discriminatedUnion('role', [
  z.object({ ...base, role: z.literal('creator'), username: usernameSchema }),
  z.object({ ...base, role: z.literal('brand'), companyName: z.string().trim().min(2, 'Company name is too short').max(120) }),
]);

export const loginSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(72),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(72), newPassword: passwordSchema })
  .refine((d) => d.currentPassword !== d.newPassword, { message: 'New password must be different', path: ['newPassword'] });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm').max(72),
  confirm: z.literal('DELETE', 'Type DELETE to confirm'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
