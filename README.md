# AuraSQL

AuraSQL is a web application that transforms natural language queries into SQL queries using AI-powered techniques. It provides a user-friendly interface to connect to databases, extract schemas, generate SQL queries, and execute them.

## Features

- **Database Connection**: Connect to PostgreSQL, MySQL, or Oracle databases.
- **Schema Extraction**: Extract and validate database schemas.
- **AI-Powered Query Generation**: Generate SQL queries from natural language descriptions or recommendations.
- **Query Execution**: Execute generated SQL queries and view results.

## Tech Stack

- **Frontend**: React, Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python)
- **API Integration**: RESTful APIs for schema extraction, query generation, and execution.

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python (v3.8 or higher)
- A running database (PostgreSQL, MySQL, or Oracle)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd /Users/shivamsourav/Downloads/txt2sql/scratch/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the application in your browser at `http://localhost:3000`.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd /Users/shivamsourav/Downloads/txt2sql/scratch/backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

5. The backend will be available at `http://localhost:8000`.

## Usage

1. **Connect to a Database**: Enter your database connection details (host, port, username, password, etc.).
2. **Extract Schema**: Extract and review the schema of the selected table.
3. **Generate SQL Queries**:
   - Use AI-generated recommendations.
   - Write custom natural language queries.
4. **Execute Queries**: Run the generated SQL queries and view the results.

## About AuraSQL

AuraSQL is designed to simplify your database management and query generation. It leverages advanced AI capabilities to understand natural language queries and translate them into executable SQL, making database interactions more intuitive and efficient.

Key features include:

- Seamless database connection and schema extraction.
- AI-powered natural language to SQL conversion.
- Query history tracking and execution.
- Intuitive dashboard for managing connections and reviewing activity.

Our goal is to empower users, from data analysts to developers, to interact with their databases more effectively, reducing the need for deep SQL expertise and accelerating data-driven decision-making.

## Developer

### Shivam Sourav

Associate Software Engineer at NRI Fintech India, passionate about creating tools that help professionals advance their careers through better resume presentation.

**Current Role:** Associate Software Engineer at NRI Fintech India
**Education:** B.Tech AI & Data Science, SMIT
**Specialization:** AI, Machine Learning, Full-stack Development
**Location:** Banka, Bihar, India

**Links:**
- [LinkedIn](https://www.linkedin.com/in/shivam-sourav-b889aa204/)
- [GitHub](https://github.com/Shivam5560)

## API Endpoints

- `POST /api/extract-schema`: Extracts the schema of a database table.
- `POST /api/insert_schema`: Inserts schema details into the backend.
- `POST /api/recommendations`: Fetches AI-generated query recommendations.
- `POST /api/query`: Generates SQL queries from natural language.
- `POST /api/query_sql`: Executes SQL queries on the database.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://reactjs.org/)
