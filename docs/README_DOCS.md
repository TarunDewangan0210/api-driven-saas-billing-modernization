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
