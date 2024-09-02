import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ErrorBoundary = () => {
  const nav = useNavigate();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      <p>Oops. Something went wrong.</p>
      <Button onClick={() => nav("/")}>Go home</Button>
    </div>
  );
};

export default ErrorBoundary;
