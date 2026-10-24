# P0 Open Points

What is left before the launch plan's P0 items are done, with a suggestion for each decision.

## Status

| P0 item | Status |
| --- | --- |
| Docker Compose setup and container images on GitHub | Done (#208, #210). The image is public. |
| v0.1.0 release with a changelog | Done. |
| Sign-in without Google (email link, OpenID Connect) | Waiting for review: #211. |
| Public demo | Not started. Needs the decisions below. |

## Next steps

1. **Review and merge #211.** Owner: Giorgio.
2. **Release v0.2.0.** The published v0.1.0 image still requires Google, so self-hosters only get email and OpenID Connect sign-in from the next release. Owner: Claude, once #211 is merged.
3. **Decide the demo questions below.** Owner: Iván.
4. **Build and deploy the demo.** Owner: Claude, after step 3.

## Demo decisions

### Web address

**Suggestion:** `demo.chironium.appfor.it`, next to production at `chironium.appfor.it`.

If the DNS or HTTPS setup can't handle a name that deep, use `chironium-demo.appfor.it`.

### Where it runs

**Suggestion:** on the production server, as a separate copy of the app.

- **Separate database.** Demo visitors can never reach real data.
- **Separate secrets.** A demo sign-in never works on production.
- **No email key.** The demo can't send email to anyone.
- **Memory and CPU limits.** A busy demo can't slow production down.
- **Updates from releases only,** not from every change merged to `main`.

It costs nothing extra. Move it to its own server only if it gets real traffic.

**Needed from you:** SSH access to the server, or you run the one-time setup yourself.

### Shared demo or one per visitor

**Suggestion:** each visitor gets their own private organization with fake data.

Why not one shared organization for everyone:

- **Vandalism.** Whatever one visitor types, every other visitor sees.
- **Real data.** Someone will try it with a real client. In a shared demo, everyone else sees that client's details, which is a privacy incident.

How it works:

1. The visitor clicks "Try the demo".
2. Chironium creates a user and an organization filled with about 15 fake patients. This takes a few seconds, behind a loading screen.
3. Every night, organizations older than 24 hours are deleted.
4. Each IP address can start only a few demos, so bots can't fill the database.

If the wait feels too long, keep a few organizations ready in advance and hand one out instantly.

**Faster alternative:** one shared organization, reset every night, with a banner: "Everyone sees what you type here. Don't enter real client data." It's quicker to build, but it keeps both risks above.
