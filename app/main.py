from fastapi import FastAPI

app=FastAPI()

@app.get("/")
def root():
    return {"Message":"HookRelay Api is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}