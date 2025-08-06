# Text2SQL

This project allows you to connect to your database and get insights from your data by asking questions in natural language. It uses the power of AI to translate your questions into SQL queries and returns the results to you.

## Workflow Diagram

```
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│   Frontend        ├─────►│   Backend         ├─────►│   Database        │
│   (Next.js)       │      │   (Flask)         │      │                   │
│                   │◄─────┤                   │◄─────┤                   │
└───────────────────┘      └───────────────────┘      └───────────────────┘
```

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   **Python 3.10 or later:** You'll need Python to run the backend. You can download it from [python.org](https://www.python.org/downloads/).
*   **Node.js v20.15.1 or later:** You'll need Node.js to run the frontend. You can download it from [nodejs.org](https://nodejs.org/en/download/).
*   **Git:** You'll need Git to clone the project. You can download it from [git-scm.com](https://git-scm.com/downloads).

### Backend Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/AuraSQL/AuraSQL.git
    cd AuraSQL
    ```

2.  **Create a virtual environment:**

    *   On macOS and Linux:

        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

    *   On Windows:

        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```

3.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Create a `.env` file:**

    Create a file named `.env` in the root directory of the project and add the following environment variables:

    ```
    # Get your API key from https://makersuite.google.com/
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"

    # Get your API key from https://groq.com/
    GROQ_API_KEY="YOUR_GROQ_API_KEY"

    # Get your API key from https://cohere.com/
    COHERE_API_KEY="YOUR_COHERE_API_KEY"

    # Get your API key from https://www.pinecone.io/
    PINECONE_API_KEY="YOUR_PINECONE_API_KEY"
    ```

### Frontend Setup

1.  **Navigate to the `frontend` directory:**

    ```bash
    cd frontend
    ```

2.  **Install the dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env.local` file:**

    Create a file named `.env.local` in the `frontend` directory and add the following environment variables:

    ```
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

    You can get these values from your Supabase project settings.

### Running the Application

1.  **Start the backend server:**

    Make sure you are in the root directory of the project and the virtual environment is activated.

    ```bash
    gunicorn -w 4 -k uvicorn.workers.UvicornWorker controller.main:app
    ```

2.  **Start the frontend server:**

    In a new terminal, navigate to the `frontend` directory.

    ```bash
    npm run dev
    ```

3.  **Open your browser:**

    Open your browser and navigate to [http://localhost:3000](http://localhost:3000).