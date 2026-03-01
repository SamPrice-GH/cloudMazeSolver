# cloudMazeSolver

A small full-stack project that solves mazes using pathfinding algorithms, made to demonstrate my understanding of cloud platforms and distrubuted systems. The backend exposes APIs for uploading mazes, requesting solves, and storing solve results. A worker polls an SQS queue to perform solves, and a React frontend provides a simple UI to upload and solve mazes.

**Features**
- Upload and store maze files (CSV) in S3
- Store maze metadata and solve results in DynamoDB
- Submit solve jobs via SQS; worker performs pathfinding and persists results
- Compute workers auto scale horizontally via CloudWatch Alarms on SQS Queue depth
- Authentication with Cognito (used by the frontend)
- Frontend UI built with React to upload mazes, request solves, and view results

**Technologies**
- Node.js + Express (API)
- React (frontend)
- AWS: S3, DynamoDB, SQS, Cognito, ALB + Auto Scaling Group, CloudWatch Alarms, Route53
- AWS SDK v3 (@aws-sdk)
- Simple pathfinding algorithms implemented: BFS, DFS, Bidirectional Search
- Docker / Docker Compose

**Architecture**
![architecture-diagram](https://github.com/SamPrice-GH/cloudMazeSolver/blob/main/cms-architecture-diagram.jpg)

---

**TODO**
- Setup orchestration via TerraForm
- Include some redacted images of AWS service config within this README
- Make UI not painful to look at

(This project is not currently live anywhere as of 2/3/26.)



