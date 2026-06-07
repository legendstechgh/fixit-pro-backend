from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json, os

app = FastAPI()

# Load issues JSON
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "issues.json")
with open(DATA_PATH, "r") as f:
    ISSUES = json.load(f)

@app.get("/")
def home():
    return {"message": "FixIt API is running"}

@app.get("/issues")
def get_issues():
    return ISSUES

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
