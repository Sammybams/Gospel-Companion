import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";

import Layout from "./pages/layout/Layout";
import Chat from "./pages/chat/Chat";
import SignUp from "./pages/auth/SignUp";
import ErrorBoundary from "./pages/ErrorBoundary";
import AuthLayout from "./pages/auth/AuthLayout";
import Login from "./pages/auth/Login";

let layout = <Layout />;

initializeIcons();

const router = createHashRouter([
  {
    path: "/",
    element: layout,
    children: [
      {
        index: true,
        element: <Chat />,
      },
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          {
            path: "signup",
            element: <SignUp />,
          },
          {
            path: "login",
            element: <Login />,
          },
        ],
      },
      {
        path: "*",
        lazy: () => import("./pages/NoPage"),
      },
    ],
    errorElement: <ErrorBoundary />,
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
