# Agentboxd Integration Architecture & Operator Workflow

Second Chance helps international prospective undergraduate applicants research US university financial-aid policies with verified, source-linked evidence passages.

The **Agentboxd integration** bridges the gap between student research and real-world institutional communication through a private, team-operated **human-in-the-loop email workflow**.

---

## 1. Product Workflow

```
[Student Research Result]
         │
         ▼
[Select Policy Questions] ─────────────► [Editable Inquiry Preview]
                                                    │
                                                    ▼
                                       [Operator Demo Portal]
                                                    │ (Authenticated via OPERATOR_TOKEN)
                                                    ▼
                                       [POST /v1/inboxes/:id/drafts]
                                                    │ (Unaddressed, unsent draft)
                                                    ▼
                                        [Agentboxd Dashboard]
                                                    │
                                                    ▼ (Human Operator Review)
                                        [Operator sets Team Test Address]
                                                    │
                                                    ▼ (Human clicks "Send")
                                        [Team Test Inbox Receives Email]
                                                    │
                                                    ▼ (Team Member Replies)
                                        [Agentboxd Inbound Webhook/Sync]
                                                    │
                                                    ▼
                                        [Operator View: Inspect Thread]
                                           (Safe plain text rendering)
```

1. **Student Inquires**: The student conducts research on an institution (e.g., Cornell, Princeton). On the result page, they open the **Inquiry Email Composer**, select specific questions they want to clarify, and preview an email draft containing official portal citations.
2. **Unaddressed Draft Creation**: For team demonstration, the operator initiates a handoff to the protected Operator Portal. With server-side authentication, the backend creates an unaddressed draft in the team's designated Agentboxd inbox via `POST /v1/inboxes/{inbox_id}/drafts`.
3. **Mandatory Human Review**: In the Agentboxd dashboard, a human operator reviews the draft content, verifies the questions, assigns a team-owned test email address as the recipient, and manually triggers send. **No email is ever sent or scheduled automatically.**
4. **Test Conversation Loop**: The team replies to the inquiry from the test address. The protected Operator Portal fetches the resulting thread and messages via the backend, displaying the real conversation with strict safety boundaries and explicit disclaimers.

---

## 2. Privacy & Security Boundaries

To safeguard user privacy and prevent unauthorized usage, strict architectural guardrails are enforced:

- **Private Team Demo Only**: This integration is designed for team demonstration and human verification. It is **not** a public multi-user messaging system.
- **Disabled by Default on Public Deployments**: Operator endpoints (`/api/operator/*`) are explicitly gated behind `ENABLE_OPERATOR_API=false`. They must be deliberately enabled for local or internal testing.
- **Server-Side Authentication**: Accessing enabled operator routes requires a secret bearer token (`OPERATOR_TOKEN`). Hidden URLs, CORS, or frontend client checks are never relied upon for security.
- **No Credentials Exposed**: `AGENTBOXD_API_KEY` and `AGENTBOXD_INBOX_ID` reside strictly on the backend server. They are never transmitted to frontend clients, logged in transcripts, or committed to Git.
- **Strictly Unaddressed Drafts**: The draft endpoint only submits `{"subject": "...", "text": "..."}`. It strictly omits recipient fields (`to`), and never invokes scheduling (`send_at`) or auto-send endpoints.
- **Untrusted Inbound Data & HTML Escaping**: Message text returned from email threads is treated as untrusted input. HTML tags are stripped and escaped before rendering in the UI to prevent XSS.
- **Zero Sensitive Data Collection**: Students are never prompted for tax documents, CSS Profile credentials, income numbers, passwords, or personal identity documents.
- **Explicit Test Labelling**: All demo conversations are explicitly tagged as **"Team Test Conversation"** and disclaim: *"This is an internal team-operated test conversation for demonstration purposes. It is not an official university response."*

---

## 3. API Contract Reference

### Operator Endpoints (Mounted under `/api/operator`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/operator/status` | `Bearer <token>` | Checks if operator mode is enabled and returns the active demo inbox ID. |
| `POST` | `/api/operator/drafts` | `Bearer <token>` | Creates an unaddressed draft in Agentboxd (`{"subject", "text"}`). Returns `draft_id`. |
| `GET` | `/api/operator/threads` | `Bearer <token>` | Retrieves active threads from the configured demo inbox. |
| `GET` | `/api/operator/threads/{thread_id}` | `Bearer <token>` | Retrieves sanitized messages for a specific demo thread. |

---

## 4. Multi-User Production Launch Roadmap

A public, production-grade release allowing applicants to manage their own university correspondence would require substantial architectural enhancements:

1. **User Authentication & Identity Federation**: Implement enterprise-grade authentication (OAuth 2.0 / OIDC / Passkeys) to uniquely authenticate each student.
2. **Multi-Tenant Data Isolation**: Implement database row-level security (RLS) guaranteeing strict tenant boundaries between students' correspondence, preventing any risk of cross-tenant data leakage.
3. **Dedicated Inboxes or Dynamic Alias Routing**: Assign student-specific alias routing (e.g. `applicant+xyz@inquiries.secondchance.org`) with strict per-user authorization policies.
4. **Webhook Signature Verification**: Secure Agentboxd webhook endpoints with HMAC-SHA256 signature verification and replay prevention.
5. **Content Security Policy & Sanitization Pipeline**: Deploy server-side email sanitization (e.g., Bleach/DOMPurify) with strict Content Security Policies (CSP) and attachment sandbox virus scanning.
6. **Regulatory & Compliance Assurance**: Ensure full compliance with FERPA (Family Educational Rights and Privacy Act) and GDPR regarding student educational records and consent.
