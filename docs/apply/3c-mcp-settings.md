# Apply guide 3c: MCP settings

Branch: `portable/mcp-settings`. Written for turning on Craft's MCP server on FullScale's real site, once.

## What was decided, and why

| Setting | Value | Where it lives |
|---|---|---|
| Authenticated MCP server | **On**, endpoint `/admin/mcp`, authorization endpoint `/admin/mcp/auth` (Craft's defaults) | Project config (`mcp:` in `project.yaml`) |
| Public MCP server | **Off** (nothing is exposed to anonymous clients) | Project config |
| Access level | **Read and write**, chosen by each person on the consent screen | **Not a setting.** See below. |

### The access level is not a server setting

Craft has no switch that caps the access level. Each person picks one level when they approve a connection, and the token carries it (`mcp:read`, `mcp:write`, `mcp:admin`). So "the lowest level that still lets drafters create drafts" is not something to configure. It is the level staff must be told to choose, and the answer was tested, not assumed:

| Level on the consent screen | Tools offered to the drafter (tested) | Can create and edit a draft? |
|---|---|---|
| **Read only** (`mcp:read`) | 14: `asset_folders_get`, `asset_folders_list`, `assets_transform_url`, `drafts_list`, `elements_field_schema`, `elements_get`, `elements_list`, `elements_schema`, `elements_validate`, `info_get`, `preferences_get`, `revisions_get`, `revisions_list`, `search_query` | **No.** `drafts_create` and `elements_update` do not exist for this token ("Tool not found"). |
| **Read and write** (`mcp:write`) | 31: the 14 above plus `asset_folders_create/delete/update`, `assets_create`, `assets_replace`, `assets_upload_url`, `drafts_apply`, `drafts_create`, `drafts_delete`, `elements_create`, `elements_delete`, `elements_duplicate`, `elements_restore`, `elements_update`, `preferences_update`, `revisions_apply`, `structures_move_element` | **Yes.** |
| Full access (`mcp:admin`) | Not offered to non-admins. The consent screen shows only the first two levels to a drafter. | n/a |

Craft decides the required level from each tool's definition: tools marked read-only need `mcp:read`, every other tool needs `mcp:write`, and admin-only tools need `mcp:admin`. `drafts_create` is not read-only, so **Read and write is the lowest level that works**, and for non-admin staff it is also the highest they can ever be given. No `configuration_*`, `project_config_*` or `plugins_*` tool appeared for the drafter at any level.

**"Read and write" does not mean "can publish".** The group permissions from 3b still apply on every call. Tested over HTTP + OAuth as the real drafter (`maya.okafor`) at Read and write:

| Action | Result |
|---|---|
| List entries, list drafts | OK |
| Create a draft of the live guide | **OK** |
| Change a field on their own draft | **OK** |
| Delete their own draft | OK |
| Apply their own draft (make it live) | Refused: "Draft not found." |
| Change the live guide directly | Refused: "You are not authorized to save this entry." |
| Delete the live guide | Refused: "Entry not found." |

The fixture guide was unchanged afterwards (checked), and no drafts were left behind.

## What was added or changed (exact list)

| Kind | Path | Port to the real site? |
|---|---|---|
| Project config | `config/project/project.yaml`: a new top-level `mcp:` block (below) and a new `dateModified` | **Merge the `mcp:` key. Never overwrite their file.** |
| Git ignore | `.gitignore`: `/storage/oauth-*.key` and `*.pem` | **Yes, do this first.** Craft's own `storage/.gitignore` does not cover the OAuth keys, so a plain `git add` would have committed the private key. |
| Keys (not in git) | `storage/oauth-private.key`, `storage/oauth-public.key` | **No. Generate on each environment** (below). |
| Build record | `scripts/portable/3c-mcp-settings.mjs` | Reference only. |
| Test | `scripts/portable/3c-access-level-test.mjs` (with `_oauth.mjs`) | Reuse. Change the URL, user and entry slug. |

The `mcp:` block, exactly as Craft wrote it:

```yaml
mcp:
  authorizationRoute: /admin/mcp/auth
  enabled: true
  publicAllowDrafts: false
  publicAllowInactive: false
  publicAllowRevisions: false
  publicEnabled: false
  publicRoute: /mcp
  route: /admin/mcp
```

## Apply on the real site

On their dev or staging copy with `allowAdminChanges` on, never live. Only admins can open this screen.

1. **Add to `.gitignore` before anything else:** `/storage/oauth-*.key` and `*.pem`. Check with `git check-ignore -v storage/oauth-private.key`.
2. **Settings > MCP.**
   - **Authenticated** tab: switch **Enable the authenticated MCP server** on. Leave both endpoints as they are.
   - **Public** tab: confirm **Enable the public MCP server** is off, and leave everything else on that tab alone.
   - Save. Commit the `project.yaml` change. If their `project.yaml` already has an `mcp:` key, stop and compare.
3. **Create the signing keys on every environment that serves MCP:** `ddev craft oauth/generate-keys` (locally) or `php craft oauth/generate-keys` on the server. It writes `storage/oauth-private.key` and `oauth-public.key` and refuses to overwrite existing keys. `--force` replaces them and **invalidates every existing token**.
   - The keys must **survive deploys** and be **identical on every web server**. If their hosting rebuilds `storage/` on each deploy or runs several servers, supply the keys through the `privateKey` and `publicKey` settings in `config/oauth.php` (they accept environment variables) instead. That is a question for Honcho (see NOTES).
4. Deploy the project config. In the replica, MCP worked with only `mcp.enabled` in project config plus the keys. Nothing else was switched on, but production is not yet tested (Step 5 runs it with `allowAdminChanges` off).
5. The CP URL of the endpoint follows their **`cpTrigger`**. If it is not `admin`, the endpoint is `/<cpTrigger>/mcp`. Craft treats the trigger as sensitive: do not paste it into public docs, issues or screenshots.

## Verify (about 15 minutes)

1. `curl -i -X POST https://<site>/admin/mcp` (no token) must answer **401** with a `WWW-Authenticate: Bearer resource_metadata=...` header. Replica: 401, pointing at `/.well-known/oauth-protected-resource/admin/mcp/auth`.
2. The two discovery documents must load as JSON: the protected-resource one from that header, and the authorization-server one (`/.well-known/oauth-authorization-server/admin/oauth/mcp`). Replica: both 200, with PKCE (`S256`) required and no client secret.
3. Run `scripts/portable/3c-access-level-test.mjs` as a real drafter. It drives the consent screen, takes a token at each level, and prints the tool list and the call results above. Replica: matches the tables above.
4. Confirm `git status` shows no key files.
5. **Check with the real client before telling staff anything.** `claude mcp add --transport http craft https://<site>/admin/mcp/auth`, then `claude mcp list`. It must say **"! Needs authentication"** (the correct state before sign-in). Replica result: with `/admin/mcp` it said "Failed to connect — Protected resource ... does not match expected ...", and with `/admin/mcp/auth` it said "Needs authentication". If it fails on certificates instead, the site's certificate chain is the problem, not Craft.

## Staff instructions this produces (for Step 8)

- On the consent screen **choose "Read and write" before clicking Authorize.** **"Read only" is pre-selected**, so a person who just clicks Authorize can read but cannot make drafts, and the AI will say it has no tool for that.
- **Craft remembers the level.** A reconnect skips the consent screen and reuses the highest level the person approved before (tested: a plain reconnect went straight to the client with the 31-tool level). Access tokens last 1 hour and refresh tokens 30 days (Craft's defaults, `config/oauth.php`), so, by the same logic (the Read only case itself was not run), someone who first approved Read only keeps getting Read only while their connection stays alive. To change level, revoke the connection and approve again. Where staff do that is Step 5 case 15.
- When the AI reports a refusal, the wording varies: "Draft not found." (applying), "Entry not found." (deleting), "You are not authorized to save this entry." (changing live content). All of them mean "your group is not allowed to do that".

## Things that will bite on the real site

1. **Keys.** Not in git, per environment, must persist and match across servers. The biggest operational risk of this change.
2. **Read only is the default.** The most likely first-day support question.
3. **Offered tools are not allowed actions.** At Read and write the drafter is offered `drafts_apply`, `elements_delete` and the rest, and Craft refuses them when they are called. Permissions (3b) are the real guardrail. The token level only narrows what is offered.
4. **Registration limit.** Dynamic client registration is limited to 10 clients per IP per hour (Craft's default `registrationRateLimit`, also user-verified). Each new person or tool that connects registers one. Several staff connecting from one office network in an hour can hit it. It can be raised in `config/oauth.php`. One client was registered during 3c and reused for every test.
5. **The endpoint is inside the control panel**, so it needs `accessCp` (3b) and follows the `cpTrigger`.
6. **Admins.** Admins are offered Full access (tested in Step 5 case 14: the admin connection received 54 tools, against 31 for a drafter). For everyday content work they should choose Read and write. In production, **15 admin write tools disappear** because they need `allowAdminChanges` (`configuration_create/update/delete`, `project_config_apply/write`, `plugins_install/uninstall/enable/disable`, `system_status_enable/disable`, `user_permissions_group_set/update`, and the two field-layout updates), but the admin read tools stay. Two powerful tools remain available at Full access even in production: `project_config_rebuild` and `user_permissions_user_set/update`. Another reason to keep Full access for deliberate admin work only.
7. **HTTPS and proxies.** The OAuth issuer and metadata URLs come from the site URL, and the replica's were correct over HTTPS. Behind a load balancer, CDN or tunnel, check that the URLs in the discovery documents show the public `https://` host.
8. **Clients that Craft should trust.** `redirectDomains` defaults to `*` (any redirect domain may register). That setting can restrict it if FullScale wants only specific clients.
9. **Local-only.** The Node test scripts on this machine need `NODE_EXTRA_CA_CERTS` pointing at the mkcert root CA (`C:\Users\ultim\AppData\Local\mkcert\rootCA.pem`), because Node does not use the Windows trust store. Claude Code's native client does not need it (it connected over HTTPS using the Windows store). Production uses a normal public certificate.
10. **Give clients the authorization endpoint.** Tell staff to connect to `https://<site>/admin/mcp/auth` (the "Authorization Endpoint" on the settings page), not `/admin/mcp`. Craft advertises its OAuth resource as `/admin/mcp/auth`, and Claude Code refuses to connect to `/admin/mcp` because that URL does not sit under the advertised resource ("Protected resource ... does not match expected ..."). Connecting to `/admin/mcp/auth` reports "Needs authentication", which is correct. The command is `claude mcp add --transport http <name> https://<site>/admin/mcp/auth`. A custom `cpTrigger` changes the first path segment.
11. **Test leftovers.** One OAuth client (`rehearsal-access-level-test`) and its tokens exist in the local database. They are not in git or project config.

## Roll back

Switch **Enable the authenticated MCP server** off and deploy. Existing tokens stop working. The keys can stay, and are never committed.

## Evidence in the replica

`docs/screenshots/3c/`: `consent-drafter.png` (what the drafter is offered: two levels, Read only pre-selected), and `consent-drafter-mcp-read.png` / `consent-drafter-mcp-write.png` (each level chosen in the test).
