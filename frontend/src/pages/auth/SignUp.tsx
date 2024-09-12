import React, { useState } from "react";
import * as Realm from "realm-web";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const MIN_LENGTH = 6;
const FIELD_VALIDATION = {
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

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });
const redirectUrl = "http://localhost:5173";

const addFieldIssue = (field: string, ctx: z.RefinementCtx) => {
  ctx.addIssue({
    code: "custom",
    message: FIELD_VALIDATION.MSG.MATCH,
    path: [field],
    fatal: true,
  });
};

const login = async (email: string, password: string) => {
  const credentials = Realm.Credentials.emailPassword(email, password);
  const authedUser = await app.logIn(credentials);
  console.assert(authedUser.id === app.currentUser?.id);
  return authedUser;
};

const signup = async (email: string, password: string) => {
  try {
    await app.emailPasswordAuth.registerUser({ email, password });
    // log in automatically
    return login(email, password);
  } catch (error) {
    throw error;
  }
};

const signupGoogle = async () => {
  const user: Realm.User = await app.logIn(
    Realm.Credentials.google({ redirectUrl })
  );
  return user;
};

const formSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(MIN_LENGTH, {
        message: FIELD_VALIDATION.MSG.MIN_LEN,
      })
      .refine(
        FIELD_VALIDATION.TEST.SPECIAL_CHAR,
        FIELD_VALIDATION.MSG.SPECIAL_CHAR
      )
      .refine(FIELD_VALIDATION.TEST.NUMBER, FIELD_VALIDATION.MSG.NUMBER),
    confirmPassword: z
      .string()
      .min(MIN_LENGTH, {
        message: FIELD_VALIDATION.MSG.MIN_LEN,
      })
      .refine(
        FIELD_VALIDATION.TEST.SPECIAL_CHAR,
        FIELD_VALIDATION.MSG.SPECIAL_CHAR
      )
      .refine(FIELD_VALIDATION.TEST.NUMBER, FIELD_VALIDATION.MSG.NUMBER),
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      addFieldIssue("password", ctx);
      addFieldIssue("confirmPassword", ctx);
    }
  });

const SignUp = () => {
  const nav = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { email, password } = values;
    let user = {};
    if (isLoggingIn) {
      user = await login(email, password);
    } else {
      user = await signup(email, password);
    }

    if (user && Object.keys(user)) {
      console.log("user: ", user);
      nav("/");
    }
  }

  const handleSignUpWithGoogle = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    await signupGoogle();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 h-screen px-4 py-8 md:w-1/4 mx-auto"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="example@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="abcd1234" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input placeholder="abcd1234" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-4">
          <Button type="submit" className="">
            Sign Up
          </Button>
          <Button variant="secondary" onClick={handleSignUpWithGoogle} disabled>
            Sign Up With Google
          </Button>
          <Button
            variant="link"
            type="submit"
            onClick={() => setIsLoggingIn(true)}
          >
            or Log In instead
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SignUp;
