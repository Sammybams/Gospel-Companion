import os
from pymongo import MongoClient

# Get Configuration Settings
from dotenv import load_dotenv
load_dotenv()

client = MongoClient(os.getenv("MONGODB_CONNECTION_STRING"))

db = client.gospel_companion_db

collection = db["gospel_companion_collection"]