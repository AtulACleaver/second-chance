# fastapi starter application
# provides health status verification route

from fastapi import FastAPI

app = FastAPI(title="Second Chance", version="0.1.0")


@app.get("/api/health")
def health():
    return {"status": "ok"}
