<img width="1360" height="768" alt="Screenshot (45)" src="https://github.com/user-attachments/assets/1e2ed3f1-bc37-4aa2-96ce-d0665cdf6d18" /># Smart Cooperative Hub - Backend API

A comprehensive backend system for managing cooperatives in Rwanda, built with Node.js, TypeScript, Express, PostgreSQL, and Prisma.
------LIST OF ALL END POINT OF THE BACKEND ------------------------![Uploading Screens<img width="1360" height="768" alt="Screenshot (43)" src="https://github.com/user-attachments/assets/0f2b4d7d-5401-479b-91a6-61e598ed02d5" />
<img width="1360" height="768" alt="Screenshot (42)" src="https://github.com/user-attachments/assets/e4ce0857-67a4-468e-8a91-7bf28072282b" />
<img width="1360" height="768" alt="Screenshot (41)" src="https://github.com/user-attachments/assets/7b547e31-0457-4d6d-b152-7560494c576f" />
<img width="1360" height="768" alt="Screenshot (40)" src="https://github.com/user-attachments/assets/e2175183-f0ca-4027-852a-f6c8c19a3298" />
<img width="1360" height="768" alt="Screenshot (39)" src="https://github.com/user-attachments/assets/c357cf0a-8b40-49fa-8b6a-f383cdb6060e" />
hot (45).png…]()
<img width="1360" height="768" alt="Screenshot (44)" src="https://github.com/user-attachments/assets/d2fd180f-b6a4-487c-90af-0a66f9e0c3ea" />

3. Running the Application
You will need three separate terminal windows for this process.

Terminal 1: Start the Backend Server
Navigate to the backend directory.
Set up the SQLite database using Prisma:
pnpm exec prisma migrate dev --name init
Start the development server:
pnpm dev
You should see a message indicating the server is running on http://localhost:4000.
Terminal 2: Expose Backend with ngrok
Run ngrok to create a public URL for your local backend server.
ngrok http 4000
ngrok will provide a "Forwarding" URL that looks like https://random-string.ngrok-free.app. Copy this HTTPS URL.
Step 3: Configure the Paypack Webhook
Go to your Paypack Dashboard.
Navigate to Applications and select the application you are using.
Go to the Webhooks section.
Set the URL to your ngrok URL, followed by /api/webhook.
Example: https://random-string.ngrok-free.app/api/webhook
Set the Mode to Production.
Ensure the Status is Active.
Save the changes.
Terminal 4: Start the Frontend Server
Navigate to the frontend directory.
Start the Vite development server:
pnpm dev
Open your browser and go to http://localhost:5173.
You are now ready to test the payment flow!

⚙️ How It Works: The Payment Flow
Initiation (Frontend → Backend): When you click "Pay Now" on the frontend, it sends your phone number and the product amount to the backend's /api/initiate-payment endpoint.
Database Record (Backend): The backend creates a Payment record in the SQLite database with a PENDING status and returns its unique paymentId to the frontend.
Paypack API Call (Backend → Paypack): The backend uses its credentials to call Paypack's /transactions/cashin API, triggering the USSD push to your phone. It then updates the local payment record with the paypackRef returned by Paypack.
Real-time Link (Frontend ↔ Backend): The frontend receives the paymentId and immediately sends it to the backend via a WebSocket connection using the registerPayment event. This tells the backend which socket connection is waiting for an update on that specific payment.
User Approval (Phone): You approve the transaction on your phone by entering your Mobile Money PIN.
Webhook Notification (Paypack → Backend): Paypack processes the transaction and sends an automated POST request (a webhook) to the public ngrok URL you configured.
Webhook Verification & DB Update (Backend): The backend's /api/webhook endpoint receives the request. It first verifies the HMAC signature to ensure the request is genuinely from Paypack. If valid, it finds the payment record using the ref and updates its status to SUCCESSFUL or FAILED.
Real-time Update (Backend → Frontend): After updating the database, the backend finds the socket connection associated with the paymentId and emits a payment:update event with the final status.
UI Update (Frontend): The frontend, which has been listening for this event, receives the update and changes the UI to show the success or failure message.
🩺 Troubleshooting
Webhook Not Received:
Ensure your backend is running and ngrok is active.
Double-check that the URL in your Paypack webhook settings is the correct https URL from ngrok and ends with /api/webhook.
Confirm the webhook Mode is set to Production in the Paypack dashboard.
Invalid Signature Error (in backend logs):
Make sure the PAYPACK_WEBHOOK_SECRET in your .env file exactly matches the secret key shown in your Paypack webhook settings.
CORS Errors:
Ensure the FRONTEND_URL in your .env file matches the URL your frontend is running on (e.g., http://localhost:5173).

✅ **Completed:**
- Blockchain service (`src/services/blockchain.service.ts`) is implemented
- Uses ethers.js v6.15.0 for Ethereum blockchain interaction
- Integrated with transaction service for logging transaction hashes
- Integrated with approval service for logging approvals
- Integrated with report service for logging reports
- Database schema includes `blockchainHash` field in Transaction model
- Simulation mode works when blockchain is not configured
