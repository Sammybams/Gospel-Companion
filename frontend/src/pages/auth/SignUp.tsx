import React, { useState } from "react";
import * as Realm from "realm-web";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(5, { message: "Must be 5 or more characters long" }),
});

const SignUp = () => {
  const nav = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
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
                <Input placeholder="savedsoul@gmail.com" {...field} />
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
                <Input placeholder="prayer" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-4">
          <Button type="submit" className="">
            Sign Up
          </Button>
          <Button
            variant="secondary"
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
