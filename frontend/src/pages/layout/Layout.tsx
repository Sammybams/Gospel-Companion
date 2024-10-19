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

  return (
    <div className="flex flex-col h-full">
      <header className="bg-[#222222] text-white p-4" role={"banner"}>
        <div className="flex items-center justify-between">
          <Link to="/" className="font-bold">
            Gospel Companion
          </Link>
          {/* no need to show "Sign Up" on the header when on the auth path or a user is available */}
          {pathname !== "/auth" && !app?.currentUser && (
            <Link
              to="auth/signup"
              className="cursor-pointer hover:text-blue-500"
            >
              Sign Up
            </Link>
          )}
          {app.currentUser && <p>Welcome, {app.currentUser?.profile?.email}</p>}
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

      <footer className="w-full flex items-center justify-center py-2">
        Gospel Companion can make mistakes. Check attached references.
      </footer>
    </div>
  );
};

export default Layout;
