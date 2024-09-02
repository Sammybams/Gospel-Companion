import React, { useContext, useState } from "react";
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

type User = {
  email: string;
  password: string;
};

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });
const signup = async (userData: User) => {
  const { email, password } = userData;
  const user: Realm.User = await app.logIn(
    Realm.Credentials.emailPassword(email, password) //!fix this
  );
  return user;
};

const signupAnon = async () => {
  const user: Realm.User = await app.logIn(Realm.Credentials.anonymous());
  console.assert(user.id === app.currentUser?.id);
  return user;
};

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(5, { message: "Must be 5 or more characters long" }),
});

const SignUp = () => {
  const nav = useNavigate();
  const [userData, setUserData] = useState<User>({
    email: "",
    password: "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const user = await signup(values);
    if (user) {
      console.log("signup response: ", user);
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
        <div className="flex flex-col gap-2">
          <Button type="submit" className="">
            Sign Up
          </Button>
          <p
            className="text-slate-600 cursor-pointer"
            onClick={() => signupAnon()}
          >
            or sign up anonymously instead
          </p>
        </div>
      </form>
    </Form>
  );
};

export default SignUp;
