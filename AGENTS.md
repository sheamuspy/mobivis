# Agent Guidelines for Mobivis

## Branch Strategy
- **ALWAYS** work on feature branches (e.g., `feature-*`, `fix-*`)
- **NEVER** push directly to `main` or `development`
- Create a new branch for each distinct change
- Use `git push -u origin <branch-name>` for new branches

## Commit Rules
- **NEVER** commit secrets, API keys, credentials, or `.env` files
- **NEVER** commit `node_modules/`, `.expo/`, or build artifacts
- Always run `git status` before committing
- Use descriptive commit messages explaining *why*, not just *what*

## Before Pushing
1. Review `git diff` for unintended changes
2. Check that `.gitignore` covers all sensitive files
3. Verify you're pushing to the correct branch

## Protected Branches
- `main` - production code, requires PR
- `development` - requires PR, never push or merge directly

## Merging
- **NEVER** merge to `development` directly - always via Pull Request
- Create PR from feature branch → development
- Get approval before merging
- Delete feature branch after merge

## Pull Requests
1. Create PR with descriptive title and summary
2. Link related issues
3. Request review from team members
4. Address review feedback
5. Do not merge without approval

## Destructive Actions
- **NEVER** force push to shared branches
- **NEVER** delete branches without confirmation
- **NEVER** reset shared branches without explicit user approval
- **NEVER** amend commits that have been pushed