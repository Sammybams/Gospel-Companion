FROM python:3.11-slim

# Install SQLite 3.35.0 or higher
RUN apt-get update && apt-get install -y sqlite3

# Install required Python packages
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy your application code
COPY . .
WORKDIR 

# Expose port 8000
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]