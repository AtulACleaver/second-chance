# Agentboxd draft demo

Second Chance helps international undergraduate applicants identify questions to ask a university. This optional, operator-assisted demo takes unanswered questions and source links exported from a research page and creates an **unaddressed, unsent** draft in a team-owned Agentboxd inbox. A human must review the content, add the correct university address, and decide whether to send. It is not a self-service integration for public visitors and it is not an eligibility decision.

The export contains the university name, unchecked questions, and source URLs. It deliberately leaves out the applicant profile and does not automatically upload anything. The person running the script sends the exported questions and URLs to Agentboxd only with the explicit `--create-draft` command. Do not use another person's export without their consent.

## Try it

1. Open a university research result, review the questions and uncheck those you want to include. Choose **Export for Agentboxd demo** in Next Questions.
2. From the repository root, install the project's Python dependencies: `python -m pip install -r requirements.txt`.
3. Preview without contacting Agentboxd: `python scripts/agentboxd_draft.py path/to/second-chance-agentboxd-handoff.json`.
4. Set `AGENTBOXD_API_KEY` and `AGENTBOXD_INBOX_ID` in your local environment. Use a key limited to the demo inbox and `drafts:write`. Do not commit the key or put it in the frontend. Consult https://agentboxd.com/docs/api#api-keys-and-permissions and https://agentboxd.com/docs/drafts for current setup.
5. Create the draft: `python scripts/agentboxd_draft.py path/to/second-chance-agentboxd-handoff.json --create-draft`.
6. Open the Agentboxd dashboard, review the questions and official links, and add the university's verified recipient. Nothing is sent or scheduled by the script.

The public app never receives or stores the Agentboxd key. This demo uses the documented `POST /v1/inboxes/:id/drafts` endpoint and does not call a send or schedule endpoint. Creating a real draft still requires an Agentboxd account and key, and the account's current plan and permissions must allow the operation. Until tested against a real account, describe this as an integration implementation, not a verified live integration.

Run offline checks with `python evaluation/agentboxd_checks.py`. They use a mock HTTP transport, not a live Agentboxd account.

The older `scripts/sponsor_draft.py` is separate from this workflow and its payload does not follow the current Agentboxd draft API. Do not use it to demonstrate the integration.

## AI disclosure

Notion AI assisted with the Agentboxd draft workflow, export, documentation, and offline checks. Team members should review and understand these changes and update the project's AI disclosure to reflect their actual contributions before submission.
