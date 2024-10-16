# these three lines swap the stdlib sqlite3 lib with the pysqlite3 package
# __import__('pysqlite3')
# import sys
# sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from functions import elementary_db, junior_db, senior_db
from functions import context_document_retreival_similarity, get_conversation_summary
from functions import qa_response, package_sources
from config.database import collection
from schemas.schema import serializer
from bson import ObjectId

# import logging
# import traceback
# logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# users = {
#     1: {
#         "name": "Samuel Bamgbola",
#         "full_history": {
#             "e": [],
#             "j": [],
#             "s": []
#         },
#         "buffer_history": {
#             "e": [],
#             "j": [],
#             "s": []
#         }
#     }
# }

sample_dict = {
    "e": [],
    "j": [],
    "s": [],
}

class User(BaseModel):
    name: str
    full_history: dict
    buffer_history: dict

class UpdateUser(BaseModel):
    user_email: Optional[str] = None
    full_history: Optional[dict[str, list]] = None
    buffer_history: Optional[dict[str, list]] = None

# Home
@app.get("/")
def index():
    return {"Project": "Gospel Companion"}

# Get users by ID
@app.get("/get-user/{user_email_address}")
def get_user(user_email_address: str):
    # Adjusted the query to reflect the new location of the email address
    user = collection.find_one({"user.data.email": user_email_address})
    return serializer(user)

@app.get("/get-users")
def get_users():
    all_users = collection.find()
    return [serializer(user) for user in all_users]

# Create new user
@app.post("/create-user")
def create_user(user: User):
    # if user_id in users:
    #     return {"Error": "User exists"}
    # users[user_id] = user
    new_user = dict(user)
    new_user["full_history"] = sample_dict
    new_user["buffer_history"] = sample_dict
    collection.insert_one(new_user)
    return serializer(collection.find_one({"name": new_user["name"]}))

# Update user information
@app.put("/update-user/{user_id}")
def update_user(user_id: str, user: UpdateUser):
    # Find the user by ObjectId
    existing_user = collection.find_one({"_id": ObjectId(user_id)})

    if not existing_user:
        return {"Error": "User does not exist"}

    update_data = {}

    # Update email if provided
    if user.user_email is not None:
        update_data['user.data.email'] = user.user_email

    # Update full_history if provided
    if user.full_history is not None:
        update_data['full_history'] = user.full_history

    # Update buffer_history if provided
    if user.buffer_history is not None:
        update_data['buffer_history'] = user.buffer_history

    # Perform the update operation
    collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    return {"message": "User updated successfully"}

@app.post("/rag-response/{user_email_address}")
def rag_response(user_email_address: str, query: str, knowledge_base: str):
    try:
        current_user = get_user(user_email_address)
        # print(current_user)
        full_history = None
        buffer_history = None
        user_full_history = current_user["full_history"]
        user_buffer_history = current_user["buffer_history"]

        knowledge_base_group = None
        vector_db, prompt_template = None, None
        if knowledge_base=='e':
            print("Elementart")
            vector_db, prompt_template = elementary_db()
            full_history = current_user["full_history"]["e"]
            buffer_history = current_user["buffer_history"]["e"]
            knowledge_base_group = 3

        elif knowledge_base=='j':
            print("Junior")
            vector_db, prompt_template = junior_db()
            full_history = current_user["full_history"]["j"]
            buffer_history = current_user["buffer_history"]["j"]
            knowledge_base_group = 2

        else:
            print("Senior")
            vector_db, prompt_template = senior_db()
            full_history = current_user["full_history"]["s"]
            buffer_history = current_user["buffer_history"]["s"]
            knowledge_base_group = 1

        new_question = query
        if len(buffer_history)>0:
            new_question = get_conversation_summary("\n".join(buffer_history), query)
        
        print(f"New question: {new_question}")
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
        update_user(current_user["id"], updated)

        result = dict()
        result['response'] = response
        result['references'] = ref_titles_links

        return result
    except Exception as e:

        # logging.error("An error occurred", exc_info=True)
        print(f"Failed to connect to tenant: {e}")
        # logging.error(f"Error: {str(e)}")
        # print(f"Error: {str(e)}")
        # return None

    # return result