# FixIt Pro Backend

![FixIt Pro](https://github.com/legendstechgh/fixit-pro-frontend/blob/main/public/fixIt-pro-Logo.png)

## Intelligent Device Diagnostics API

The backend service powering **FixIt Pro**, a device diagnostics and repair assistance platform built for the Splunk Hackathon.

FixIt Pro helps users identify common device problems, understand potential causes, receive repair guidance, estimate repair costs, and determine when professional assistance may be required.

The backend processes user-reported symptoms, matches them against a structured repair knowledge base, generates troubleshooting recommendations, records diagnostic history, and produces observability data for monitoring and analytics.

---

# Live Deployment

Backend API:

https://fixit-pro-backend.onrender.com

Frontend Application:

https://fixit-pro-splunk.netlify.app

---

# Features

## Device Diagnostics

* Symptom-based fault detection
* Rule-based diagnostic engine
* Multi-device support
* Repair recommendation generation
* Severity assessment
* Confidence scoring
* Cost estimation
* Technician recommendation system

---

## Repair Guidance

Each diagnosis includes:

* Possible causes
* Beginner repair steps
* Intermediate repair steps
* Advanced repair steps
* Safety warnings
* Success probability estimates

---

## Observability & Monitoring

Built for the Splunk Hackathon.

FixIt Pro generates structured diagnostic events including:

* Device type
* Reported symptom
* Diagnosis result
* Severity level
* Confidence score
* Repair outcome feedback

These events can be routed into monitoring and analytics pipelines to support:

* Trend detection
* Usage analytics
* Fault pattern analysis
* Continuous system improvement

---

## Learning & Feedback

* Diagnostic history tracking
* User feedback collection
* Success/failure recording
* Future model improvement support

---

# Tech Stack

## Backend

* Node.js
* Express.js

## Storage

* JSON Knowledge Base
* JSON History Storage

## Services

* Splunk Event Logging
* Diagnostic Engine
* Feedback System
* Statistics Tracking

## Deployment

* Render

---

# Project Structure

```text
fixit-pro-backend/
│
├── data/
│   ├── issues.json
│   └── history.json
│
├── routes/
│   └── diagnose.js
│
├── services/
│   ├── logger.js
│   ├── memory.js
│   ├── splunk.js
│   └── aiEnhancer.js
│
├── server.js
├── package.json
└── README.md
```

---

# API Endpoints

## Health Check

```http
GET /test
```

Example Response:

```json
{
  "status": "connected",
  "message": "Backend working"
}
```

---

## Run Diagnosis

```http
POST /diagnose
```

Request:

```json
{
  "device": "phone",
  "symptom": "battery drains quickly"
}
```

Example Response:

```json
{
  "device": "phone",
  "diagnosis": "Battery degradation detected",
  "severity": "medium",
  "confidence": "high",
  "technicianRequired": false,
  "costEstimate": "$10 - $80"
}
```

---

## Statistics

```http
GET /stats
```

Returns platform statistics and usage information.

---

## Feedback

```http
POST /feedback
```

Request:

```json
{
  "timestamp": 123456789,
  "success": true
}
```

Stores user feedback for future system improvements.

---

# Installation

Clone the repository:

```bash
git clone https://github.com/legendstechgh/fixit-pro-backend.git
```

Navigate into the project:

```bash
cd fixit-pro-backend
```

Install dependencies:

```bash
npm install
```

Create a .env file:

```env
CLAUDE_API_KEY=
```

(API key optional)

---

# Run Locally

Start the development server:

```bash
npm start
```

Backend runs on:

```text
http://localhost:8000
```

Test the server:

```text
http://localhost:8000/test
```

---

# How It Works

1. User submits a device type and symptom.
2. Backend receives the request.
3. Diagnostic engine searches the knowledge base.
4. Matching issue patterns are identified.
5. Severity and confidence scores are generated.
6. Repair recommendations are assembled.
7. Feedback and analytics are recorded.
8. Results are returned to the frontend.

---

# Challenges Solved

* Making diagnostics accessible to non-technical users
* Creating structured repair guidance
* Supporting offline operation without paid AI APIs
* Building a reliable hackathon-ready architecture
* Generating useful observability data
* Capturing feedback for future improvements

---

# Future Improvements

* Voice-based diagnostics
* Image-assisted fault detection
* Predictive maintenance
* Expanded repair knowledge base
* Technician marketplace integration
* Mobile application
* ML-powered recommendations
* Real Splunk dashboard integration

---

# Splunk Hackathon Project

FixIt Pro was built for the Splunk Hackathon to demonstrate how operational and diagnostic event data can be transformed into actionable insights.

By combining device troubleshooting with observability concepts, the platform helps users solve problems while generating valuable telemetry for analysis and continuous improvement.

---

# Developer

**Alvin Akaba**

Founder, Legends Tech

GitHub:

https://github.com/legendstechgh

---

# License

MIT License

Feel free to use, modify, and improve this project.
