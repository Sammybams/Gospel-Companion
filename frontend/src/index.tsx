import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";

import Layout from "./pages/layout/Layout";
import Chat from "./pages/chat/Chat";
import SignUp from "./pages/auth/SignUp";
import ErrorBoundary from "./pages/ErrorBoundary";

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
        element: <SignUp />,
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
