import * as Realm from "realm-web";
import { z } from "zod";

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });
const redirectUrl = "http://localhost:5173";

export const MIN_LENGTH = 6;
export const FIELD_VALIDATION = {
  TEST: {
    SPECIAL_CHAR: (value: string) =>
      /[-._!"`'#%&,:;<>=@{}~\$\(\)\*\+\/\\\?\[\]\^\|]+/.test(value),
    NUMBER: (value: string) => /.*[0-9].*/.test(value),
  },
  MSG: {
    MIN_LEN: `Password must have ${MIN_LENGTH} characters`,
    SPECIAL_CHAR: "Password must contain at least one special character",
    NUMBER: "Password must contain at least one number",
    MATCH: "Password must match",
  },
};

export const addFieldIssue = (field: string, ctx: z.RefinementCtx) => {
  ctx.addIssue({
    code: "custom",
    message: FIELD_VALIDATION.MSG.MATCH,
    path: [field],
    fatal: true,
  });
};

export const signup = async (email: string, password: string) => {
  try {
    await app.emailPasswordAuth.registerUser({ email, password });
    // log in automatically
    return login(email, password);
  } catch (error) {
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  const credentials = Realm.Credentials.emailPassword(email, password);
  const authedUser = await app.logIn(credentials);
  console.assert(authedUser.id === app.currentUser?.id);
  return authedUser;
};

export const signupGoogle = async () => {
  const user: Realm.User = await app.logIn(
    Realm.Credentials.google({ redirectUrl })
  );
  return user;
};
