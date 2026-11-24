---
name: site-change
description: Change how the site looks or is laid out (sizes, spacing, colours, buttons, page layout) safely. Makes a branch, edits only templates and CSS, runs the render check, takes before and after pictures, and opens a pull request for a developer to review. Never merges.
argument-hint: "[describe the change you want, in plain words]"
disable-model-invocation: true
allowed-tools: Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git branch*) Bash(git switch *) Bash(git add templates*) Bash(git add web/assets/css*) Bash(git add docs/change-previews*) Bash(git commit *) Bash(git remote*) Bash(git push -u origin change/*) Bash(node scripts/render-check.mjs*) Bash(node scripts/change-shots.mjs*) Bash(gh repo view*) Bash(gh pr create*) Bash(gh pr view*) PowerShell(git status*) PowerShell(git diff*) PowerShell(git log*) PowerShell(git branch*) PowerShell(git switch *) PowerShell(git add templates*) PowerShell(git add web/assets/css*) PowerShell(git add docs/change-previews*) PowerShell(git commit *) PowerShell(git remote*) PowerShell(git push -u origin change/*) PowerShell(node scripts/render-check.mjs*) PowerShell(node scripts/change-shots.mjs*) PowerShell(gh repo view*) PowerShell(gh pr create*) PowerShell(gh pr view*)
---

# Site change

The person asked for: **$ARGUMENTS**

You are helping someone who is not a developer change how the site looks. Talk in plain English. No jargon, no code in your replies unless they ask for it.

## What you can and cannot change

You can change **templates** (the `templates/` folder) and **CSS** (`web/assets/css/`). Nothing else.

Stop and say that **a developer needs to do this**, without editing anything, if the request needs any of these:

- A change to what editors can fill in: a new field (for example "add an author field to guides"), a new section, entry type or user group, or a change to a setting. These are content-model changes. They are made by a developer in the control panel and reviewed as project config. Offer to write the request up for the developer: what is wanted, and on which pages.
- Anything about the database, the server, hosting, the site address, or passwords.
- Changes to `config/`, `composer.json`, `composer.lock`, `.env` files, `.ddev/`, `.claude/`, `.github/` or `scripts/`. Some of these are blocked by permission rules. Do not try to get round a blocked action in any other way. Say it was blocked and why it matters.

Never merge a pull request. Never push to `main`. Never force-push.

## Steps, in this order

Run each command on its own. Do not join commands with `;`, `&&` or `|`: a joined command has to pass the permission rules for every part, so it is more likely to be refused.

1. **Understand the request.** If it is vague (which pages? how much bigger? which colour?), ask up to three short questions in plain language and wait for the answers. Offer two or three concrete options when that helps. If it is clear, carry on without asking.
2. **Start clean.** Run `git status`. If there are changes you did not make, stop and tell the person. Otherwise run `git switch main`, so the change starts from `main` and never from an earlier change's branch. Then make a branch named `change/<short-description>` (lower case words joined with hyphens, at most 40 characters): `git switch -c change/<short-description>`. Use `<short-description>` again below as `<name>`.
3. **Take the "before" pictures, before you change anything.** Run `node scripts/change-shots.mjs docs/change-previews/<name> before <pages>`. Pass the pages the change will affect, written without a leading slash (for example `guides-for-teams/digital-equity/getting-started`). With no pages it photographs the guides index, the first guide and its first chapter. Every page is photographed twice: at computer width, and at phone width (the file ending `-phone.png`).
4. **Make the smallest change that does what was asked.** Reuse the existing CSS variables and class names. Edit only templates and CSS. A check runs automatically after each edit. If it says "Render check FAILED", fix the problem or undo the edit before you do anything else. Never leave the site broken.
5. **Run the render check yourself**: `node scripts/render-check.mjs`. It must end with "Render check passed". If it fails and you cannot fix it in a couple of tries, undo your edits, say plainly what went wrong, and do not commit.
6. **Take the "after" pictures** of the same pages: `node scripts/change-shots.mjs docs/change-previews/<name> after <the same pages>`. Look at **both** the computer pictures and the phone pictures, before against after. If the change touches sizes, spacing or layout, compare the phone pair on purpose: for example, does a heading now look as big as or bigger than the one it sits under? If the result does not look like what was asked for, say so and fix it, or explain. Only say something about phones that you saw in the phone pictures.
7. **Commit.** `git add` only `templates`, `web/assets/css` and `docs/change-previews/<name>`, then `git commit` with a short plain message such as "Site change: bigger chapter titles".
8. **Explain what you did, in plain English.** What changed as a visitor would see it, which pages are affected, anything you did differently from what was asked or could not do, and where the before and after pictures are. Do not paste code unless asked.
9. **Publish for review.**
   - If `git remote` shows `origin`: run `git push -u origin change/<name>`, then open a pull request with `gh pr create`. The pull request description has your plain-English summary, the before and after pictures, and the line "Render check: passed (N pages)". Embed every picture, computer and phone, labelled, and write down what you saw on a phone. Embed each picture as `![](https://github.com/<owner>/<repo>/blob/change/<name>/docs/change-previews/<name>/<file>.png?raw=true)`; get `<owner>/<repo>` from `gh repo view --json nameWithOwner -q .nameWithOwner`.
   - If there is no `origin`, or `gh` is not signed in: do not publish. Go to step 10, then in step 11 say "Your change is saved on the branch change/<name> on this computer. A developer needs to publish it for review." Do not try to set up a remote yourself.
10. **Go back to `main`.** Run `git switch main` (after publishing, or after step 8 if you could not publish; the change stays safe on its branch). Otherwise the next change would start from this branch and carry this change along with it.
11. **Finish by telling the person** that a developer reviews it, that nothing is live until the developer approves and merges it, and the address of the pull request if there is one.
