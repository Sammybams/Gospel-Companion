import os

# Add OpenAI library
import openai

# Get Configuration Settings
from dotenv import load_dotenv
load_dotenv()

# Gathering references
import requests
from bs4 import BeautifulSoup as bs

base_link = "https://apostolicfaithweca.org"

# Configure OpenAI API using Azure OpenAI
openai.api_key = os.getenv("API_KEY")
openai.api_base = os.getenv("ENDPOINT")
openai.api_type = "azure"  # Necessary for using the OpenAI library with Azure OpenAI
openai.api_version = os.getenv("OPENAI_API_VERSION")  # Latest / target version of the API

from langchain.embeddings import OpenAIEmbeddings

# OpenAI Settings
model_deployment = "text-embedding-ada-002"
# SDK calls this "engine", but naming it "deployment_name" for clarity

model_name = "text-embedding-ada-002"

# Embeddings
openai_embeddings: OpenAIEmbeddings = OpenAIEmbeddings(
    openai_api_version = os.getenv("OPENAI_API_VERSION"), openai_api_key = os.getenv("API_KEY"),
    openai_api_base = os.getenv("ENDPOINT"), openai_api_type = "azure"
)

# RAG Setup
from langchain.chat_models import ChatOpenAI

# LLM
llm = ChatOpenAI(temperature = 0.6, openai_api_key = os.getenv("API_KEY"), openai_api_base = os.getenv("ENDPOINT"), model_name="gpt-35-turbo", engine="Voicetask")

# Handling vector database
from langchain_chroma import Chroma
from langchain import PromptTemplate

# Elementary
def elementary_db():
    template_e = """
    Use the following context (delimited by <ctx></ctx>) and the chat history (delimited by <hs></hs>) to answer the user's question. 
    All bible texts are to referenced with King James Version. You can give info on bible texts.
    If you don't know the answer, just say that you don't know, don't try to make up an answer. Refer to the context provided as "the Elementart Sunday school lessons".
    ------
    <ctx>
    {context}
    </ctx>
    ------
    <hs>
    {history}
    </hs>
    ------
    {question}
    Answer:
    """

    prompt = PromptTemplate(
        input_variables=["history", "context", "question"],
        template=template_e,
    )

    vector_store_elementary = Chroma(
        collection_name="Elementary_Lessons",
        embedding_function=openai_embeddings,
        persist_directory="./chroma_afc_sunday_school_lessons_db",  # Where to save data locally, remove if not neccesary
    )
    return vector_store_elementary, prompt

# Junior
def junior_db():
    template_j = """
    Use the following context (delimited by <ctx></ctx>) and the chat history (delimited by <hs></hs>) to answer the user's question. 
    All bible texts are to referenced with King James Version. You can give info on bible texts.
    If you don't know the answer, just say that you don't know, don't try to make up an answer. Refer to the context provided as "the Junior Sunday school lessons".
    ------
    <ctx>
    {context}
    </ctx>
    ------
    <hs>
    {history}
    </hs>
    ------
    {question}
    Answer:
    """
    prompt = PromptTemplate(
        input_variables=["history", "context", "question"],
        template=template_j,
    )

    vector_store_junior = Chroma(
        collection_name="Junior_Lessons",
        embedding_function=openai_embeddings,
        persist_directory="./chroma_afc_sunday_school_lessons_db",  # Where to save data locally, remove if not neccesary
    )
    return vector_store_junior, prompt

# Senior
def senior_db():
    template_s = """
    Use the following context (delimited by <ctx></ctx>) and the chat history (delimited by <hs></hs>) to answer the user's question. 
    All bible texts are to referenced with King James Version. You can give info on bible texts.
    If you don't know the answer, just say that you don't know, don't try to make up an answer. Refer to the context provided as "the Senior Sunday school lessons".
    ------
    <ctx>
    {context}
    </ctx>
    ------
    <hs>
    {history}
    </hs>
    ------
    {question}
    Answer:
    """

    prompt = PromptTemplate(
        input_variables=["history", "context", "question"],
        template=template_s,
    )

    vector_store_senior = Chroma(
        collection_name="Senior_Lessons",
        embedding_function=openai_embeddings,
        persist_directory="./chroma_afc_sunday_school_lessons_db",  # Where to save data locally, remove if not neccesary
    )
    return vector_store_senior, prompt

# Verbosity
import langchain
langchain.verbose = False

def context_document_retreival_similarity(question_summary, vector_db):
    results = vector_db.similarity_search(question_summary, k=5)
    context = ""
    sources = []
    for result in results:
        context += result.page_content + "\n"
        new_source = result.metadata['source'].split("/")[-1]
        if new_source not in sources:
            sources.append(new_source)
    return context, sources

def conversation_history_prompt(history, question):
    # Define the template string for summarizing conversation history
    template_summary = """
    "Given a chat history (delimited by <hs></hs>) and the latest user question \
    which might reference context in the chat history, formulate a standalone question \
    which can be understood without the chat history. Do NOT answer the question, \
    just reformulate it if needed and otherwise return it as is.
    ------
    <hs>
    {history}
    </hs>
    ------
    Question: {question}
    Summary:
    """

    # Create a PromptTemplate object
    prompt = PromptTemplate(
        input_variables=["history", "question"],
        template=template_summary,
    )

    return prompt.format(history=history, question=question)

def get_conversation_summary(history, question):
    # Get the conversation summary prompt
    formatted_prompt = conversation_history_prompt(history, question)

    # Query the Azure OpenAI LLM with the formatted prompt
    response = openai.ChatCompletion.create(
        engine="Voicetask",  # Replace with your Azure OpenAI deployment name
        # prompt=formatted_prompt,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": formatted_prompt}
        ],
        # max_tokens=50,
        temperature=0.5
    )
    
    # Extract and return the summary from the response
    return response.choices[0].message['content']

def qa_response(prompt):

    # Query the Azure OpenAI LLM with the formatted prompt
    response = openai.ChatCompletion.create(
        engine="Voicetask",  # Replace with your Azure OpenAI deployment name
        # prompt=formatted_prompt,
        messages=[
            # {"role": "system", "content": "You are a helpful assistant vast in the Bible and its Doctrines."},
            {"role": "user", "content": prompt}
        ],
        # max_tokens=50,
        temperature=0.5
    )
    
    # Extract and return the summary from the response
    return response.choices[0].message['content']

def get_lesson_link(lessson_number, group):
    base_link_group = f"https://apostolicfaithweca.org/sunday-school-lesson-library?llang=1&slc={group}&title=&Slno={lessson_number}"
    r_g = requests.get(base_link_group)
    soup_g = bs(r_g.content)
    group_suffix = soup_g.find_all(class_ = "views-field views-field-title")[1].a['href']
    group_title = soup_g.find_all(class_ = "views-field views-field-title")[1].a.text
    return group_title, base_link+group_suffix

def package_sources(source_names, group):
    source_names = source_names[:3]
    lesson_links = []
    for soure_name in source_names:
        lesson_number = soure_name.split("Lesson")[-1].split("_")[0]
        lesson_links.append(get_lesson_link(lesson_number, group))

    return lesson_links
    