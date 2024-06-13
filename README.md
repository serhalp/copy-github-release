# copy-github-release

A simple script to copy a GitHub release from one repository to another

## Assumptions

This makes some very specific assumptions:

- The release is linked to a git tag
- The git tag also exists in the target repo

## Prerequisites

- This script requires node v20 or above.
- Generate a GitHub Personal Access Token (PAT) with [the necessary
  permissions](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release--fine-grained-access-tokens).

## Usage

Install dependencies:

```sh
corepack enable pnpm
pnpm install
```

To copy release `v1.2.3` from `myname/old-repo` to `myfriend/new-repo`:

```sh
GITHUB_TOKEN="<your PAT>" pnpm run start --from myname/old-repo --to myfriend/new-repo --release v1.2.3
```

To copy multiple releases, just tweak the code or send me a pull request!
