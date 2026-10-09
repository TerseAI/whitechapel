# Cloud deployment

Whitechapel runs at [whitechapel-rho.vercel.app](https://whitechapel-rho.vercel.app) on Vercel with Terse Cloud case, scene and conversation actors. Vercel serves the React frontend, story assets and Express API. Browser gameplay uses player-scoped WebSockets directly to Terse; interview generation runs inside ConversationActor with two case calls per ordinary turn.

Use Node.js 22.19 or newer and the package versions pinned in the lockfile. Link your own Vercel and Terse projects; account-specific links and secrets are excluded from the repository.

## Actor deployment

From the repository root:

```sh
npm ci
npm run actors:generate
npm test
npm run build:sixth-murder
npm run cloud:prepare
npm run test:cloud
cd .terse/whitechapel-sixth-murder
npm ci
terse deploy
```

Run plain `terse deploy` from the generated project. Preparation copies the actor source graph and selected story, embeds validated story data in the actor bundle and preserves its `terse.config.json` link. Keep edits in the source repository; preparation replaces generated files. Actor code and story changes require another preparation and deployment. Regenerate the official actor client when public methods or their types change; never edit generated declarations manually.

All three actor types request a five-second idle timeout through `@Compute`. This setting travels with the actor deployment. Actors can go dormant between the browser's 20-second heartbeats; the next command or heartbeat wakes them. Running handlers finish before eviction, and open WebSockets remain at the gateway. ConversationActor activates per case and stable character identity. Objects and detectives remain records inside CaseActor.

After deployment, run `npm run test:cloud:hosted` from the repository root. It creates fresh cloud test cases and verifies authentication, two-player WebSockets, solo starts and membership protection. `npm run test:persistence` separately verifies interview checkpoints and completed testimony across local runtime restarts.

## Actor credentials and save format

Configure `WHITECHAPEL_ACTOR_URL` and `WHITECHAPEL_ACTOR_KEY` as Terse project secrets, using the gateway's `TERSE_ACTOR_URL` and `TERSE_API_KEY` values. Workers use these server-only credentials for scene calls, conversation checkpoints and case commits. Configure `AI_MODE=live`, `TYPESAFE_API_KEY`, `FAL_KEY`, `CHARACTER_MODEL`, `CHARACTER_REASONING_EFFORT` and optional `JEV_MODEL`/`FAL_VOICES` in the actor project as well. Provider credentials belong to the actor project; Vercel only needs `AI_MODE=live` to expose live interview controls. Use `terse secrets add NAME --value-stdin --skip-local-sync`; never include values in source or command arguments.

Storage version 5 is a deliberate development reset. The current runtime exports CaseActor, SceneActor and ConversationActor; old entity actors, importers and migration endpoints are absent. New case and scene addresses cannot load retired records. Browser credentials use the same storage version, so users start fresh cases after this deployment. See [architecture](architecture.md) for the address format. There are no legacy redirects or data migrations.

Stage the matching website with `vercel deploy --prod --skip-domain --yes --scope <your-vercel-team>`, deploy the prepared actors, then promote that website deployment with `vercel promote <deployment-url> --yes --scope <your-vercel-team>`. Verify the hosted actors and website after promotion. Both builds must agree on storage version as well as story ID and version.

## Website deployment

Configure these variables for Vercel production and preview:

```dotenv
STORY_PATH=stories/sixth-murder/story.json
TERSE_ACTOR_URL=https://api.useterse.ai/<your-project-id>/actors
TERSE_API_KEY=your-terse-token
AI_MODE=live
```

Use `vercel env add` with stdin for secrets. Do not commit environment files or pull Vercel environment settings over the local development file.

```sh
vercel deploy --prod --yes --scope <your-vercel-team>
```

The TypeScript configs keep `module` explicit because Vercel applies runtime defaults before resolving inherited compiler options. Vercel runs `build:vercel`, copies registered story assets into the static output and bundles the selected story with the API. The API runs in `iad1` with a six-minute execution limit. The website opens without a password or sign-in cookie. Case reads, actions and socket grants still require player credentials. Provider keys and the Terse API token remain server-only.

The live game uses four direct services: Vercel for hosting, Terse Cloud for persistent case, scene and conversation actors, fal for dialogue and voice, and TypeSafe/Jev for character decisions and review. Gemini and ElevenLabs are accessed through fal, including fal's OpenRouter endpoint for dialogue; they do not need separate application credentials.

Gemini 3.8 Flash writes dialogue with medium thinking. Jev chooses disclosures and reviews factual grounding and progress. ElevenLabs Scribe v2 transcribes microphone input; ElevenLabs Turbo v2.5 voices replies. All Gemini and ElevenLabs calls use fal. No separate OpenAI key is required.

Generated audio stays with fal and each client plays its returned HTTPS media URL directly. Microphone recordings go directly to ConversationActor over its authenticated socket. Whitechapel saves text, duration and provider-job metadata, not generated audio files. There is no Blob store or persistent application disk. Old conversations remain readable when provider recordings expire. There are no Vercel audio routes or audio signing keys. Conversation socket heartbeats resume checkpointed work; generation is awaited inside the actor runtime, independent of Vercel request lifetime.

## Web Analytics

Enable **Web Analytics** for your project in the Vercel dashboard before deploying. Production builds include the official React analytics component; local development does not send visits. The dashboard shows visitors and page views from the time collection starts, with production and preview traffic available separately.

Tracked page URLs exclude query parameters and fragments, including case invitation codes. The integration does not send game conversations, player credentials or custom gameplay events. No additional environment variables are required.

## Playing together

Open the same production URL on both devices. Choose **Play with a partner**, share the case invitation, select different inspectors and mark both ready. Both players must agree on reports. **Play solo** creates a separate case with one detective and adapted requirements. Each browser retains its own player credentials; use the same browser profile to return.

The website and actors must use the same story ID, story version and storage version. Mystery in Whitechapel uses story version 6 and engine storage version 5. Old invitations and browser saves cannot resume the retired data model; start a new case and share its new invitation.

## Local development

`npm run dev:sixth-murder` uses local actors. `npm run dev:cloud` uses the hosted actor endpoint from `.env.local`. `npm run host:cloud` builds and serves the application locally against cloud actors, but Vercel is the shared-play deployment. Live interviews and cloud actors require Internet access even when both players share a LAN.
