# A09 Security Logging & Alerting Failures
## Introduction
- Without logging and monitoring, attacks and breaches cannot be detected, and without alerting it is very difficult to respond quickly and effectively during a security incident. 
- Always underrepresented in the data
    - cannot test this effectively
    - statistical data alone makes this problem look much smaller than it actually is
- cybersecurity professionals worldwide explicitly voted during the community survey to manually force this category onto the list
## Theory
- Why failures happen
    - Missing or inconsistent (only recording successfull logins) records for failed logins and high-value transactions
    - Log injection risks caused by failing to correctly encode incoming log data(malicious injected code might run)
    - Sensitive data leaks from logging private information like PII (Personally Identifiable Information) or PHI (Protected Health Information)
    - Silent application errors that fail to trigger any log entries (app crashes silently without sending an error report to anyone)
    - Lack of live monitoring for application and API traffic
- How to Prevent Failures
    - Log all security checks and failures with user context (who)
    - encode all incoming data correctly before it is logged (preventing malicious injected code from running)
    - Give the security team clear, step-by-step instructions on how to react (monitoring)
    - Store logs in a separate, secure location
    - Using AI might help in reducing false alarms
## Practical Example
- Topics:
    - Logged failed/successfull login (audit trail?)
    - Error Handling (logs, snackbar)
    - Rate-Limit (alert after 5 tries)
    - Log format/structure (in/sensitive data)
## Summary