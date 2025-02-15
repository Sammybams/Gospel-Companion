# these three lines swap the stdlib sqlite3 lib with the pysqlite3 package
# __import__('pysqlite3')
# import sys
# sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, List
from pydantic import BaseModel
from functions import elementary_db, junior_db, senior_db
from functions import context_document_retreival_similarity, get_conversation_summary
from functions import qa_response, package_sources
from config.database import collection
from schemas.schema import serializer
from bson import ObjectId
import random
import uuid

# import logging
# import traceback
# logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(
    title = "Gospel Companion API",
    description = "API for the Gospel Companion project",
    version = "1.0.0"
)
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

sample_dict = {
    "e": {
        "responses": [],
        "references": []
        },
    "j": {
        "responses": [],
        "references": []
        },
    "s": {
        "responses": [],
        "references": []
        }
}

class User(BaseModel):
    user_id: str
    full_history: dict
    buffer_history: dict

class UpdateUser(BaseModel):
    user_id: Optional[str] = None
    full_history: Optional[Dict] = None
    buffer_history: Optional[Dict] = None

# Home
@app.get("/", tags=["Home"])
def index():
    return {"Project": "Gospel Companion"}

# Get users by ID
@app.get("/get-user/{user_id}", tags=["Authentication"])
def get_user(user_id: str):
    # Adjusted the query to reflect the new location of the email address
    user = collection.find_one({"user_id": user_id})
    return serializer(user)

@app.get("/get-users", tags=["Authentication"])
def get_users():
    all_users = collection.find()
    return [serializer(user) for user in all_users]

# Create new user
@app.post("/create-user", tags=["Authentication"])
def create_user():
    # if user_id in users:
    #     return {"Error": "User exists"}
    # users[user_id] = user
    new_user = dict()
    new_user["user_id"] = str(uuid.uuid4()) # some randomly generated id
    new_user["full_history"] = sample_dict
    new_user["buffer_history"] = sample_dict
    collection.insert_one(new_user)
    return serializer(collection.find_one({"user_id": new_user["user_id"]}))

# Update user information
@app.put("/update-user/{user_id}", tags=["Authentication"])
def update_user(user_id: str, user: dict):
    # Find the user by ObjectId
    existing_user = collection.find_one({"user_id": user_id})

    if not existing_user:
        return {"Error": "User does not exist"}

    # update_data = {}

    # # Update email if provided
    # if user.user_id is not None:
    #     update_data['user_id'] = user.user_id

    # # Update full_history if provided
    # if user.full_history is not None:
    #     update_data['full_history'] = user.full_history

    # # Update buffer_history if provided
    # if user.buffer_history is not None:
    #     update_data['buffer_history'] = user.buffer_history

    # Perform the update operation
    collection.update_one({"user_id": user_id}, {"$set": user})

    return {"message": "User updated successfully"}

@app.post("/rag-response/{user_id}", tags=["RAG"])
def rag_response(user_id: str, query: str, knowledge_base: str, regenerate: bool = False):
    extra = int(regenerate)
    try:
        current_user = get_user(user_id)
        full_history = None
        buffer_history = None
        user_full_history = current_user["full_history"]
        user_buffer_history = current_user["buffer_history"]

        knowledge_base_group = None
        vector_db, prompt_template = None, None
        if knowledge_base=='e':
            # print("Elementary")
            vector_db, prompt_template = elementary_db()
            full_history = current_user["full_history"]["e"]
            buffer_history = current_user["buffer_history"]["e"]
            knowledge_base_group = 3

        elif knowledge_base=='j':
            # print("Junior")
            vector_db, prompt_template = junior_db()
            full_history = current_user["full_history"]["j"]
            buffer_history = current_user["buffer_history"]["j"]
            knowledge_base_group = 2

        else:
            # print("Senior")
            vector_db, prompt_template = senior_db()
            full_history = current_user["full_history"]["s"]
            buffer_history = current_user["buffer_history"]["s"]
            knowledge_base_group = 1
        
        value = ""
        new_question = query
        if len(buffer_history["responses"])>1:
            value = ["\n".join(val) for val in buffer_history["responses"][1-extra:len(buffer_history["responses"])-extra]]
            new_question = get_conversation_summary("\n".join(value), query)
        
        # print(f"New question: {new_question}")
        documents, sources = context_document_retreival_similarity(new_question, vector_db)
        full_prompt = prompt_template.format(history="\n".join(value), question=new_question, context=documents)
        if regenerate:
            # Generate random number between 0.3 and 0.8 for temperature if regenerate is True
            temperature = round(random.uniform(0.3, 0.8), 2)
            response = qa_response(full_prompt, temp=temperature)
        else:
            response = qa_response(full_prompt)
        
        ref_titles_links = package_sources(sources, knowledge_base_group)

        combined = []
        combined.append(f"Human: {query}")
        combined.append(f"AI: {response}")
        
        if regenerate:
            full_history["responses"] = full_history["responses"][:-1]
            full_history["references"] = full_history["references"][:-1]
            buffer_history["responses"] = buffer_history["responses"][:-1]
            buffer_history["references"] = buffer_history["references"][:-1]
        
        full_history["responses"].append(combined)
        full_history["references"].append(ref_titles_links)
        buffer_history["responses"].append(combined)
        buffer_history["references"].append(ref_titles_links)

        if len(buffer_history["responses"])>6:
            buffer_history["responses"] = buffer_history["responses"][1:]
            buffer_history["references"] = buffer_history["references"][1:]

        user_full_history[knowledge_base] = full_history
        user_buffer_history[knowledge_base] = buffer_history

        updated = {
            "user_id": current_user["user_id"],
            "full_history": user_full_history,
            "buffer_history": user_buffer_history
        }
        update_user(current_user["user_id"], updated)

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