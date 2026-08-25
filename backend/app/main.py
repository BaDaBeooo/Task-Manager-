from fastapi import FastAPI

app = FastAPI(title="Task Manager API")


@app.get("/")
def root():
    return {
        "message": "Task Manager API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }