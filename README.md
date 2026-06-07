# FixIt Pro Backend

AI-powered diagnostic engine and API for FixIt Pro.

## Overview

FixIt Pro Backend powers the diagnostic intelligence behind FixIt Pro, an AI-powered device diagnostics and repair assistant designed to help users identify faults, understand repair options, estimate repair costs, and determine when professional assistance is needed.

The backend analyzes user-reported symptoms, matches them against a repair knowledge base, generates troubleshooting guidance, records diagnostic history, collects user feedback, and provides analytics for continuous improvement.

---

## Features

### Device Diagnostics

* Symptom-based fault detection
* Multi-device support
* Repair recommendation generation
* Severity assessment
* Confidence scoring

### Repair Guidance

* Beginner repair steps
* Intermediate repair steps
* Advanced repair steps
* Safety warnings
* Technician recommendations

### Intelligence Layer

* Local AI enhancement
* Improved diagnosis explanations
* Risk assessment
* Additional repair advice

### Analytics & Monitoring

* Diagnostic event logging
* Usage statistics
* Feedback collection
* Splunk integration

### Learning System

* Diagnosis history storage
* Success/failure tracking
* User feedback recording

---

## Supported Devices

* Smartphones
* Laptops
* Refrigerators
* Washing Machines
* Microwaves

Additional device categories can be added through the knowledge base.

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Data Storage

* JSON-based knowledge base
* Local history storage

### Services

* Splunk logging
* Local AI enhancement
* Diagnostic engine

---

## Project Structure

```text
backend/
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
│
└── package.json
```

---

## API Endpoints

### Health Check

```http
GET /test
```

Response:

```json
{
  "status": "connected",
  "message": "Backend working"
}
```

---

### Run Diagnosis

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
  "technicianRequired": false
}
```

---

### Statistics

```http
GET /stats
```

Returns system usage statistics.

---

### Feedback

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

Stores user feedback for future improvements.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/legendstechgh/-fixit-pro-backend.git
```

Navigate into the project:

```bash
cd fixit-pro-backend
```

Install dependencies:

```bash
npm install
```

---

## Run Locally

Start the server:

```bash
node server.js
```

Backend runs on:

```text
http://localhost:8000
```

Test connection:

```text
http://localhost:8000/test
```

---

## How It Works

1. User submits a device type and symptom.
2. Backend searches the repair knowledge base.
3. Matching issue patterns are identified.
4. Repair recommendations are generated.
5. Severity and confidence scores are assigned.
6. Local AI enhancement improves explanations.
7. Results are returned to the frontend.
8. Diagnostic history and analytics are recorded.

---

## Challenges Solved

* Reliable symptom matching
* Structured repair recommendations
* User-friendly diagnostic output
* Offline-capable intelligence layer
* Analytics and feedback integration
* Stable hackathon-ready architecture

---

## Future Improvements

* Image-based diagnostics
* Voice troubleshooting assistant
* Predictive maintenance
* Technician marketplace integration
* Expanded repair knowledge base
* Mobile API support
* Machine learning model integration

---

## Hackathon Project

Built as part of a hackathon project focused on making device troubleshooting more accessible, affordable, and practical while helping reduce unnecessary repair costs and electronic waste.

---

## License

MIT License
