import { Delete24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
interface Props {
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}

export const ClearChatButton = ({ disabled, onClick }: Props) => {
  return (
    <Button icon={<Delete24Regular />} disabled={disabled} onClick={onClick}>
      {"Clear chat"}
    </Button>
  );
};
