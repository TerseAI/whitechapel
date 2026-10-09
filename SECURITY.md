# Security

Report vulnerabilities privately through the repository's GitHub **Security →
Report a vulnerability** form. Include affected versions, reproduction steps
and impact. Do not put credentials, player tokens or private conversations in
public issues. Only the current `main` branch is maintained.

Keep provider credentials in local ignored environment files or deployment
secrets. `.env.example` contains names and safe defaults only. Never put server
keys in `VITE_*` variables. If a credential is exposed, revoke or rotate it before
removing it from source or history.

Hosted deployments use paid AI and actor services. A public website allows
visitors to create cases; player credentials protect individual cases but do
not impose a global spending limit. Configure provider quotas and deployment
access controls appropriate to your deployment. Browser reset clears local
credentials and preferences; it does not delete a hosted case or provider data.
