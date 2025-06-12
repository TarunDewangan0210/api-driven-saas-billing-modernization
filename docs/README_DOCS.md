* Flow Chart Document
flowchart TD
    A[Web/Mobile Apps, Admin Panel, Third-party APIs] --> B[API Gateway <br>JWT Validation, Rate Limiting, CORS]
    B --> C1[Auth Service <br>JWT & OAuth2]
    B --> C2[Customer Service <br>Customer Management]
    B --> C3[Plan Service <br>Pricing & Features]
    B --> C4[Subscription Service <br>Lifecycle Management]
    B --> C5[Invoice Service <br>Billing & Payments]
    C1 --> D1[MongoDB]
    C2 --> D1
    C3 --> D1
    C4 --> D1
    C5 --> D1
    C1 --> D2[Redis]
    C2 --> D2
    C3 --> D2
    C4 --> D2
    C5 --> D2

![image](https://github.com/user-attachments/assets/1737d336-52d9-44ab-86fc-91f9dd2d4506)

* ER system flow diagram
  
  erDiagram
    CUSTOMER {
      string id PK
      string name
      string email
      string status
      date created_at
    }
    PLAN {
      string id PK
      string name
      string description
      decimal price
      string currency
      int interval
    }
    SUBSCRIPTION {
      string id PK
      string customer_id FK
      string plan_id FK
      date start_date
      date end_date
      string status
    }
    INVOICE {
      string id PK
      string customer_id FK
      string subscription_id FK
      decimal amount
      date issued_at
      date due_at
      string status
    }

    CUSTOMER ||--o{ SUBSCRIPTION : "has"
    PLAN ||--o{ SUBSCRIPTION : "offered to"
    CUSTOMER ||--o{ INVOICE : "receives"
    SUBSCRIPTION ||--o{ INVOICE : "generates"
  
![image](https://github.com/user-attachments/assets/010a432a-f44c-4668-97c9-6e203651e43d)

* Mind Map

  mindmap
  root((SaaS Billing System))
    Client Tier
      Web/Mobile Apps
      Admin Panel
      Third-party APIs
    API Gateway
      Security (JWT, Rate Limiting, CORS)
      Routing
    Business Services
      Auth Service
      Customer Service
      Plan Service
      Subscription Service
      Invoice Service
    Data Layer
      MongoDB
      Redis
    Containerization & Deployment
      Docker
      Kubernetes / Docker Swarm
    Security
      JWT & OAuth2
      Middleware (Helmet, Rate Limit, CORS)
    Observability
      Monitoring (Prometheus, Grafana)
      Logging (ELK)
      Tracing (Jaeger)
    Infrastructure
      Load Balancer / WAF
      CDN
      VPC / Firewalls
      Backups (S3/MinIO)
    Compliance
      GDPR, PCI DSS, SOC 2

  ![image](https://github.com/user-attachments/assets/61d949b6-ca9c-4bb6-b2cd-b9fe483668c2)

  * User Journey
 
  journey
    title SaaS Billing System - User Journey
    section Registration & Onboarding
      User visits signup page: 5: User
      User submits registration details: 4: User
      System creates customer profile: 3: System
      User receives confirmation email: 3: User
    section Plan Selection & Subscription
      User browses available plans: 4: User
      User selects a plan: 5: User
      System processes plan selection: 3: System
      User enters payment information: 4: User
      System creates subscription: 3: System
    section Usage & Management
      User accesses dashboard: 5: User
      User manages subscription (upgrade/cancel): 4: User
      System updates subscription and invoices: 3: System
    section Billing & Invoicing
      System generates invoice: 2: System
      User receives invoice notification: 3: User
      User reviews and pays invoice: 5: User
      System confirms payment: 4: System
    section Support & Account Management
      User accesses support/helpdesk: 4: User
      User updates account info/settings: 4: User
      System processes and stores updates: 3: System

  ![image](https://github.com/user-attachments/assets/4c1250ca-d05a-4630-aaf9-e681d11b6119)



