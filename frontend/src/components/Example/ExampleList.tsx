import { Example } from "./Example";

import styles from "./Example.module.css";

const DEFAULT_EXAMPLES: string[] = [
  "What is the story of David and Goliath about?",
  "What does the parable of the Good Samaritan teach?",
  "Explain the need for Salvation",
];

interface Props {
  onExampleClicked: (value: string) => void;
  useGPT4V?: boolean;
}

export const ExampleList = ({ onExampleClicked, useGPT4V }: Props) => {
  return (
    <ul className={styles.examplesNavList}>
      {DEFAULT_EXAMPLES.map((question, i) => (
        <li key={i}>
          <Example
            text={question}
            value={question}
            onClick={onExampleClicked}
          />
        </li>
      ))}
    </ul>
  );
};
