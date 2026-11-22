# Releasing `agentflow-sdk` to npm

Zero-manual-steps releases via GitHub Actions.

## One-time setup (only needed once, ever)

1. **Create an npm account** (if you don't have one) at [npmjs.com](https://www.npmjs.com/signup).
2. **Create an npm access token** — [npmjs.com/settings/YOUR_USER/tokens](https://www.npmjs.com/settings/~/tokens) → *Generate New Token* → **Automation** (or *Granular*, scoped to `agentflow-sdk`).
   - Copy the token (starts with `npm_...`). You won't see it again.
3. **Add it to your GitHub repo** as a secret:
   - `github.com/c0ntr1butr/DeltaDevs.ai` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: paste the token
4. **First-time only — reserve the package name** by running one manual publish so npm knows the package belongs to you:
   ```bash
   cd sdks/typescript
   yarn && yarn build && npm pack
   npm login             # once, on your local machine
   npm publish agentflow-sdk-0.4.0.tgz --access public
   ```
   After this, every future release goes through CI.

## Cutting a release (every time after the first)

```bash
# 1. Bump the version in sdks/typescript/package.json (patch/minor/major)
cd sdks/typescript
npm version patch          # or: npm version minor / major
# This writes the new version to package.json AND creates a git tag v<new>.

# 2. Push the commit and the tag
git push
git push --tags
```

That's it. The `.github/workflows/npm-publish.yml` workflow will:

1. Run `yarn typecheck` and `yarn test` (must be green).
2. Run `yarn build` (tsup → ESM + CJS + .d.ts).
3. Verify the git tag version matches `package.json` version and that the package name is `agentflow-sdk`.
4. Run `npm publish --access public --provenance` using your `NPM_TOKEN`.

**Provenance** is enabled — every published version gets a signed statement on npm proving it was built from this exact GitHub commit. Enterprise buyers love this.

## Continuous integration (already active for every PR)

`.github/workflows/sdk-ci.yml` runs on every PR that touches `sdks/typescript/**`:

- `yarn typecheck`
- `yarn test`   (vitest, 17 cases)
- `yarn build`
- `npm pack` + install the tarball into a fresh scratch dir and verify `require('agentflow-sdk')` returns `Agentflow`, `Agentflow.ai`, `Decision`, etc.

All three Node versions (18, 20, 22) are matrix-tested.

## Manual override (emergency publish)

Actions → `Publish agentflow-sdk to npm` → **Run workflow** → pick the branch. This publishes whatever version is currently in `package.json` — use only for hotfixes when the tag automation isn't an option.

## Verifying the published package

```bash
npm view agentflow-sdk versions
npm install agentflow-sdk
node -e "const m = require('agentflow-sdk'); console.log(m.Agentflow.ai, m.Agentflow, m.Decision);"
```
