import { useRef, useState, useEffect } from "react";
import {
  Checkbox,
  Panel,
  DefaultButton,
  TextField,
  SpinButton,
} from "@fluentui/react";
import { SparkleFilled } from "@fluentui/react-icons";
import readNDJSONStream from "ndjson-readablestream";

import styles from "./Chat.module.css";

import {
  chatApi,
  RetrievalMode,
  ChatAppResponse,
  ChatAppResponseOrError,
  ChatAppRequest,
  ResponseMessage,
  VectorFieldOptions,
  GPT4VInput,
} from "../../api";
import { Answer, AnswerError, AnswerLoading } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ExampleList } from "../../components/Example";
import { UserChatMessage } from "../../components/UserChatMessage";
import { ClearChatButton } from "../../components/ClearChatButton";
import { VectorSettings } from "../../components/VectorSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

//import { useMsal } from "@azure/msal-react";
import * as Realm from "realm-web";
import axios from "axios";

const app = new Realm.App({ id: import.meta.env.VITE_REALM_APP_ID });
const baseUrl = "http://127.0.0.1:8000";
axios.defaults.baseURL = baseUrl;

type References = {
  topic: "";
  link: "";
};

type RagResponse = {
  response: "";
  references: References[];
};

type KnowledgeBase = "e" | "j" | "s" | null;

const Chat = () => {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState<string>("");
  const [retrieveCount, setRetrieveCount] = useState<number>(3);
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(
    RetrievalMode.Hybrid
  );
  const [useSemanticRanker, setUseSemanticRanker] = useState<boolean>(true);
  const [shouldStream, setShouldStream] = useState<boolean>(true);
  const [useSemanticCaptions, setUseSemanticCaptions] =
    useState<boolean>(false);
  const [excludeCategory, setExcludeCategory] = useState<string>("");
  const [useSuggestFollowupQuestions, setUseSuggestFollowupQuestions] =
    useState<boolean>(false);
  const [vectorFieldList, setVectorFieldList] = useState<VectorFieldOptions[]>([
    VectorFieldOptions.Embedding,
  ]);
  const [useOidSecurityFilter, setUseOidSecurityFilter] =
    useState<boolean>(false);
  const [useGroupsSecurityFilter, setUseGroupsSecurityFilter] =
    useState<boolean>(false);
  const [gpt4vInput, setGPT4VInput] = useState<GPT4VInput>(
    GPT4VInput.TextAndImages
  );

  const lastQuestionRef = useRef<string>("");
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<unknown>();

  const [activeCitation, setActiveCitation] = useState<string>();

  const [selectedAnswer, setSelectedAnswer] = useState<number>(0);
  const [answers, setAnswers] = useState<
    [user: string, response: ChatAppResponse][]
  >([]);
  const [showGPT4VOptions, setShowGPT4VOptions] = useState<boolean>(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(null);

  const makeApiRequest = async (question: string) => {
    lastQuestionRef.current = question;

    error && setError(undefined);
    setIsLoading(true);
    setActiveCitation(undefined);

    try {
      const request: ChatAppRequest = {
        prompt: question,
        session_id: "1234", // TODO: Need to generate a session id
      };

      const response = await chatApi(request);
      const contentType = response.headers.get("content-type");
      if (!response.body) {
        throw Error("No response body");
      } else if (
        contentType?.indexOf("text/html") !== -1 ||
        contentType?.indexOf("text/plain") !== -1
      ) {
        const bodyText = await response.text();
        console.error(`Chat Error: ${bodyText}`);
        setError(bodyText);
      } else {
        const parsedResponse: ChatAppResponse = await response.json();
        setAnswers([...answers, [question, parsedResponse]]);
      }
      // if (shouldStream) {
      //     const parsedResponse: ChatAppResponse = await handleAsyncRequest(question, answers, setAnswers, response.body);
      //     setAnswers([...answers, [question, parsedResponse]]);
      // } else {
      //     const parsedResponse: ChatAppResponseOrError = await response.json();
      //     if (response.status > 299 || !response.ok) {
      //         throw Error(parsedResponse.error || "Unknown error");
      //     }
      //     setAnswers([...answers, [question, parsedResponse as ChatAppResponse]]);
      // }
    } catch (e) {
      console.error(`Chat Error: ${e}`);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  const makeApiRequest_local = async (question: string) => {
    lastQuestionRef.current = question;
    if (!knowledgeBase) {
      console.log("No knowledge base selected");
      return;
    }

    // error && setError(undefined);
    setIsLoading(true);
    setActiveCitation(undefined);

    const email = app.currentUser?.profile?.email;

    if (!email?.length) {
      setError("No logged in user");
    }

    try {
      const { data, status } = await axios.post<RagResponse>(
        `/rag-response/${email}?query=${question}&knowledge_base=${knowledgeBase}`
      );
      if (status === 200) {
        let { response, references } = data;
        let referencesString: string = "";
        references?.map(
          ({ topic, link }) => (referencesString += "\n" + topic + "\n" + link)
          // (referencesString += [link])
        );
        response += "\n" + referencesString;
        const parsedResponse = { message: response };
        setAnswers([...answers, [question, parsedResponse]]);
      } else {
        // throw error;
      }
    } catch (error) {
      console.error(`Chat Error: ${error}`);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    lastQuestionRef.current = "";
    error && setError(undefined);
    setActiveCitation(undefined);
    setAnswers([]);
    setIsLoading(false);
    setIsStreaming(false);
  };

  useEffect(
    () => chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" }),
    [isLoading]
  );

  const onPromptTemplateChange = (
    _ev?: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
    newValue?: string
  ) => {
    setPromptTemplate(newValue || "");
  };

  const onRetrieveCountChange = (
    _ev?: React.SyntheticEvent<HTMLElement, Event>,
    newValue?: string
  ) => {
    setRetrieveCount(parseInt(newValue || "3"));
  };

  const onUseSemanticRankerChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setUseSemanticRanker(!!checked);
  };

  const onUseSemanticCaptionsChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setUseSemanticCaptions(!!checked);
  };

  const onShouldStreamChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setShouldStream(!!checked);
  };

  const onExcludeCategoryChanged = (
    _ev?: React.FormEvent,
    newValue?: string
  ) => {
    setExcludeCategory(newValue || "");
  };

  const onUseSuggestFollowupQuestionsChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setUseSuggestFollowupQuestions(!!checked);
  };

  const onUseOidSecurityFilterChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setUseOidSecurityFilter(!!checked);
  };

  const onUseGroupsSecurityFilterChange = (
    _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
    checked?: boolean
  ) => {
    setUseGroupsSecurityFilter(!!checked);
  };

  const onExampleClicked = (example: string) => {
    makeApiRequest_local(example);
  };

  const onShowCitation = (citation: string, index: number) => {
    // if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab && selectedAnswer === index) {
    //     setActiveAnalysisPanelTab(undefined);
    // } else {
    setActiveCitation(citation);
    //    setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
    //}

    setSelectedAnswer(index);
  };

  const handleSelect = (value: string) => {
    setKnowledgeBase(value as KnowledgeBase);
  };

  return (
    <div className={styles.container}>
      <div className="flex items-center justify-center gap-4 self-end p-4">
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select knowledge base" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="e">Elementary</SelectItem>
            <SelectItem value="j">Junior</SelectItem>
            <SelectItem value="s">Senior</SelectItem>
          </SelectContent>
        </Select>
        <ClearChatButton
          className={styles.commandButton}
          onClick={clearChat}
          disabled={!lastQuestionRef.current || isLoading}
        />
      </div>
      <div className={styles.chatRoot}>
        <div className={styles.chatContainer}>
          {!lastQuestionRef.current ? (
            <div className={styles.chatEmptyState}>
              <SparkleFilled
                fontSize={"120px"}
                primaryFill={"rgba(115, 118, 225, 1)"}
                aria-hidden="true"
                aria-label="Chat logo"
              />
              <h1 className="text-center font-semibold text-4xl py-8 px-4">
                Chat with Your Bible Study Guide
              </h1>
              <h2 className={styles.chatEmptyStateSubtitle}>
                Ask anything or try an example
              </h2>
              <ExampleList onExampleClicked={onExampleClicked} />
            </div>
          ) : (
            <div className={styles.chatMessageStream}>
              {answers?.map((answer, index) => (
                <div key={index}>
                  <UserChatMessage message={answer[0]} />
                  <div className={styles.chatMessageGpt}>
                    <Answer
                      isStreaming={false}
                      key={index}
                      answer={answer[1]}
                      isSelected={selectedAnswer === index}
                      onCitationClicked={(c) => onShowCitation(c, index)}
                      onThoughtProcessClicked={() => {}} // {() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                      onSupportingContentClicked={() => {}} // {() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                      onFollowupQuestionClicked={(q) => makeApiRequest_local(q)}
                      showFollowupQuestions={
                        useSuggestFollowupQuestions &&
                        answers.length - 1 === index
                      }
                    />
                  </div>
                </div>
              ))}
              {isLoading && (
                <>
                  <UserChatMessage message={lastQuestionRef.current} />
                  <div className={styles.chatMessageGptMinWidth}>
                    <AnswerLoading />
                  </div>
                </>
              )}
              {error ? (
                <>
                  <UserChatMessage message={lastQuestionRef.current} />
                  <div className={styles.chatMessageGptMinWidth}>
                    <AnswerError
                      error={error.toString()}
                      onRetry={() =>
                        makeApiRequest_local(lastQuestionRef.current)
                      }
                    />
                  </div>
                </>
              ) : null}
              <div ref={chatMessageStreamEnd} />
            </div>
          )}

          <div className={styles.chatInput}>
            <QuestionInput
              clearOnSend
              placeholder="Type a new question (e.g. what are some examples of applying faith?)"
              disabled={isLoading}
              onSend={(question) => makeApiRequest_local(question)}
            />
          </div>
        </div>

        <Panel
          headerText="Configure answer generation"
          isOpen={isConfigPanelOpen}
          isBlocking={false}
          onDismiss={() => setIsConfigPanelOpen(false)}
          closeButtonAriaLabel="Close"
          onRenderFooterContent={() => (
            <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>
              Close
            </DefaultButton>
          )}
          isFooterAtBottom={true}
        >
          <TextField
            className={styles.chatSettingsSeparator}
            defaultValue={promptTemplate}
            label="Override prompt template"
            multiline
            autoAdjustHeight
            onChange={onPromptTemplateChange}
          />

          <SpinButton
            className={styles.chatSettingsSeparator}
            label="Retrieve this many search results:"
            min={1}
            max={50}
            defaultValue={retrieveCount.toString()}
            onChange={onRetrieveCountChange}
          />
          <TextField
            className={styles.chatSettingsSeparator}
            label="Exclude category"
            onChange={onExcludeCategoryChanged}
          />
          <Checkbox
            className={styles.chatSettingsSeparator}
            checked={useSemanticRanker}
            label="Use semantic ranker for retrieval"
            onChange={onUseSemanticRankerChange}
          />
          <Checkbox
            className={styles.chatSettingsSeparator}
            checked={useSemanticCaptions}
            label="Use query-contextual summaries instead of whole documents"
            onChange={onUseSemanticCaptionsChange}
            disabled={!useSemanticRanker}
          />
          <Checkbox
            className={styles.chatSettingsSeparator}
            checked={useSuggestFollowupQuestions}
            label="Suggest follow-up questions"
            onChange={onUseSuggestFollowupQuestionsChange}
          />

          <Checkbox
            className={styles.chatSettingsSeparator}
            checked={shouldStream}
            label="Stream chat completion responses"
            onChange={onShouldStreamChange}
          />
        </Panel>
      </div>
    </div>
  );
};

export default Chat;
