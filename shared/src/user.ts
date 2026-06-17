import { Type, type Static } from '@sinclair/typebox';

/** Investment style chosen at signup / editable on the profile page. */
export const InvestStyle = Type.Union(
  [
    Type.Literal('conservative'),
    Type.Literal('balanced'),
    Type.Literal('aggressive'),
    Type.Literal('momentum'),
  ],
);
export type InvestStyle = Static<typeof InvestStyle>;

export const UserProfile = Type.Object(
  {
    id: Type.String(),
    username: Type.String(),
    email: Type.String({ format: 'email' }),
    avatar: Type.String(),
    investStyle: Type.Optional(InvestStyle),
    createdAt: Type.String({ format: 'date-time' }),
  },
);
export type UserProfile = Static<typeof UserProfile>;

export const AuthResponse = Type.Object(
  {
    token: Type.String({ description: 'Bearer token (mock for now)' }),
    user: UserProfile,
  },
);
export type AuthResponse = Static<typeof AuthResponse>;

export const SignupBody = Type.Object({
  username: Type.String({ minLength: 2, maxLength: 20 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
});
export type SignupBody = Static<typeof SignupBody>;

export const LoginBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBody>;

/** Partial profile update (PATCH /auth/me). All fields optional. */
export const UpdateProfileBody = Type.Object({
  username: Type.Optional(Type.String({ minLength: 2, maxLength: 20 })),
  avatar: Type.Optional(Type.String()),
  investStyle: Type.Optional(InvestStyle),
});
export type UpdateProfileBody = Static<typeof UpdateProfileBody>;
