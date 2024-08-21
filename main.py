from fastapi import FastAPI, Path
from typing import Optional
from pydantic import BaseModel
from functions import elementary_db, junior_db, senior_db
from functions import context_document_retreival_similarity, get_conversation_summary
from functions import qa_response, package_sources

app = FastAPI()

users = {
    1: {
        "name": "Samuel Bamgbola",
        "ID": "0x1kjsd3wr",
        "full_history": {
            "e": [],
            "j": [],
            "s": []
        },
        "buffer_history": {
            "e": [],
            "j": [],
            "s": []
        }
    }
}

class User(BaseModel):
    name: str
    ID: str
    full_history: dict
    buffer_history: dict

class UpdateUser(BaseModel):
    name: Optional[str] = None
    ID: Optional[str] = None
    full_history: Optional[dict] = None
    buffer_history: Optional[dict] = None

# Home
@app.get("/")
def index():
    return {"Project": "Gospel Companion"}

# Get users by ID
@app.get("/get-users{user_id}")
def get_user(user_id: int = Path(description="The ID of the user you want to view", gt=0)):
    return users[user_id]

# Create new user
@app.post("/create-user/{user_id}")
def create_user(user_id: int, user: User):
    if user_id in users:
        return {"Error": "User exists"}
    users[user_id] = user
    return users[user_id]

# Update user information
@app.put("/update-user/{user_id}")
def update_user(user_id: int, user: UpdateUser):
    if user_id not in users:
        return {"Error": "User does not exist"}

    if user.name != None:
        users[user_id]['name'] = user.name

    if user.ID != None:
        users[user_id]['ID'] = user.ID

    if user.full_history != None:
        users[user_id]['full_history'] = user.full_history

    if user.buffer_history != None:
        users[user_id]['buffer_history'] = user.buffer_history  

    return users[user_id]

@app.post("/rag-response/{user_id}")
def rag_response(user_id: int, query: str, knowledge_base: str):
    current_user = get_user(user_id)
    full_history = None
    buffer_history = None
    user_full_history = current_user["full_history"]
    user_buffer_history = current_user["buffer_history"]

    knowledge_base_group = None
    vector_db, prompt_template = None, None
    if knowledge_base=='e':
        vector_db, prompt_template = elementary_db()
        full_history = current_user["full_history"]["e"]
        buffer_history = current_user["buffer_history"]["e"]
        knowledge_base_group = 3

    elif knowledge_base=='j':
        vector_db, prompt_template = junior_db()
        full_history = current_user["full_history"]["j"]
        buffer_history = current_user["buffer_history"]["j"]
        knowledge_base_group = 2

    else:
        vector_db, prompt_template = senior_db()
        full_history = current_user["full_history"]["s"]
        buffer_history = current_user["buffer_history"]["s"]
        knowledge_base_group = 1

    new_question = query
    if len(buffer_history)>0:
        new_question = get_conversation_summary("\n".join(buffer_history), query)
    
    print(new_question)
    documents, sources = context_document_retreival_similarity(new_question, vector_db)
    full_prompt = prompt_template.format(history="\n".join(buffer_history), question=new_question, context=documents)
    response = qa_response(full_prompt)
    ref_titles_links = package_sources(sources, knowledge_base_group)

    full_history.append(f"Human: {query}")
    full_history.append(f"AI: {response}")
    buffer_history.append(f"Human: {query}")
    buffer_history.append(f"AI: {response}")

    if len(buffer_history)>10:
        buffer_history = buffer_history[2:]

    user_full_history[knowledge_base] = full_history
    user_buffer_history[knowledge_base] = buffer_history
    updated = UpdateUser()
    updated.full_history = user_full_history
    updated.buffer_history = user_buffer_history
    update_user(user_id, updated)

    return response, ref_titles_links
