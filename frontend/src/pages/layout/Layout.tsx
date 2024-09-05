import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import * as Realm from "realm-web";

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });

const Layout = () => {
  const { pathname } = useLocation();
  const handleLogout = async () => {
    if (app.currentUser) {
      await app.currentUser.logOut();
      window.location.reload();
    } else {
      // alert "No logged-in user"
    }
  };

  const signupGoogle = async () => {
    const redirectUrl = "http://localhost:5173";
    const user: Realm.User = await app.logIn(
      Realm.Credentials.google({ redirectUrl })
    );
    console.log("user: ", user);
    return user;
  };

  useEffect(() => {
    console.log("app.currentUser: ", app.currentUser);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="bg-[#222222] text-white h-[10dvh] p-4" role={"banner"}>
        <div className="flex items-center justify-between">
          <Link to="/" className="font-bold">
            Gospel Companion
          </Link>
          {/* no need to show "Sign Up" on the header when on the auth path or a user is available */}
          {pathname !== "/auth" && !app?.currentUser && (
            <Button
              onClick={signupGoogle}
              className="cursor-pointer hover:text-blue-500"
            >
              Sign Up
            </Button>
          )}
          {app.currentUser && <p>Welcome, {app.currentUser?.id}</p>}
          {app.currentUser && (
            <p
              onClick={handleLogout}
              className="cursor-pointer hover:text-red-500"
            >
              Log Out
            </p>
          )}
        </div>
      </header>

      <Outlet />

      <footer className="w-full flex items-center justify-center gap-2 py-4 mt-8">
        <p>Built with &#10084; by</p>
        <a
          href="https://github.com/Sammybams"
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          Samuel
        </a>
        <p>&</p>
        <a
          href="https://github.com/Fiewor"
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          John
        </a>
      </footer>
    </div>
  );
};

export default Layout;
