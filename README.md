# TenantFlow Orchestrator

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)](frontend)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](backend)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](#)
[![ML](https://img.shields.io/badge/ML-Logistic%20Regression-5C6BC0)](#machine-learning)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)](#docker-setup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

TenantFlow Orchestrator is a multi-tenant intelligent task management platform for organizations to plan work, coordinate teams, and track performance. The system combines a modern full-stack architecture with AI-driven delay prediction and analytics to support data-informed project execution.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation Guide](#installation-guide)
- [API Overview](#api-overview)
- [Machine Learning](#machine-learning)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

## Overview

TenantFlow Orchestrator is designed for multi-tenant environments where multiple organizations securely share the same platform while maintaining strict data isolation. It provides:

- Structured project and task lifecycle management
- Team performance visibility through analytics
- Delay-risk prediction using machine learning
- Scalable deployment through Docker and Docker Compose

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- TailwindCSS
- ShadCN UI

### Backend

- FastAPI (Python)

### Database

- PostgreSQL

### Machine Learning

- Logistic Regression model for task delay prediction

### Containerization

- Docker
- Docker Compose

### Version Control

- Git
- GitHub

## Architecture

TenantFlow Orchestrator follows a modern full-stack architecture:

- Frontend (React) communicates with the FastAPI REST API
- FastAPI handles authentication, tenant isolation, business logic, and analytics endpoints
- Backend services interact with PostgreSQL for persistence
- ML prediction service provides delay-risk inference
- Access is controlled through role-based policies and multi-tenant boundaries

```text
Frontend (React + Vite)
	|
	v
FastAPI REST API
   |            \
   v             v
PostgreSQL     ML Prediction Service
```

## Project Structure

```text
tenantflow-orchestrator
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   └── vite.config.ts
│
├── backend
│   ├── app
│   │   ├── routers
│   │   ├── services
│   │   │   └── ml.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Features

- Multi-Tenant Architecture
- Role-Based Access Control
- Intelligent Task Assignment
- AI Delay Prediction
- Task Analytics Dashboard
- Kanban Task Management
- Notifications & Alerts
- Federated Learning Simulation
- Dockerized Deployment

## Installation Guide

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend URL:

```text
http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### Docker Setup

```bash
docker-compose up --build
```

## API Overview

Representative endpoints:

- `POST /auth/login`
- `GET /tasks`
- `POST /tasks`
- `GET /analytics`
- `POST /predict-delay`

## Machine Learning

The platform uses a Logistic Regression model to estimate the probability that a task will be delayed. Prediction signals include:

- task complexity
- assigned workload
- historical delays
- completion time trends

## Screenshots

- Dashboard Screenshot (placeholder)
- Task Board Screenshot (placeholder)
- Analytics Dashboard Screenshot (placeholder)

## Future Improvements

- Real-time notifications
- Kubernetes deployment
- Model retraining pipeline
- Advanced analytics

## Author

**Karthik GV**

## License

This project is licensed under the MIT License.
