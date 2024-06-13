import { Octokit } from "@octokit/rest";
import { program } from "commander";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const getReleaseDetails = async (
  octokit: Octokit,
  repoOwner: string,
  repoName: string,
  tag: string,
) => {
  const { data: release } = await octokit.repos.getReleaseByTag({
    owner: repoOwner,
    repo: repoName,
    tag,
  });

  return {
    assets: release.assets,
    body: release.body ?? undefined,
    name: release.name ?? undefined,
    tagName: release.tag_name,
    targetCommitish: release.target_commitish,
  };
};

const downloadAsset = async (
  assetUrl: string,
  assetName: string,
): Promise<string> => {
  const tmpDir = await mkdtemp(join(tmpdir(), "release-assets-"));
  const assetPath = join(tmpDir, assetName);

  const response = await fetch(assetUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });

  const buffer = await response.arrayBuffer();
  await writeFile(assetPath, Buffer.from(buffer));
  return assetPath;
};

const uploadAsset = async (
  octokit: Octokit,
  repoOwner: string,
  repoName: string,
  releaseId: number,
  assetPath: string,
  assetName: string,
): Promise<void> => {
  const assetData = await readFile(assetPath);

  await octokit.repos.uploadReleaseAsset({
    owner: repoOwner,
    repo: repoName,
    release_id: releaseId,
    name: assetName,
    data: assetData.toString("utf8"),
  });
};

const copyRelease = async (
  octokit: Octokit,
  fromRepo: string,
  toRepo: string,
  tag: string,
): Promise<void> => {
  const [fromOwner, fromRepoName] = fromRepo.split("/");
  const { assets, body, name, tagName, targetCommitish } =
    await getReleaseDetails(octokit, fromOwner, fromRepoName, tag);

  const [toRepoOwner, toRepoName] = toRepo.split("/");
  const { data: newRelease } = await octokit.repos.createRelease({
    owner: toRepoOwner,
    repo: toRepoName,
    body,
    name,
    tag_name: tagName,
    target_commitish: targetCommitish,
  });

  for (const asset of assets) {
    const assetName = asset.name;
    console.log(`Downloading asset: ${assetName}`);
    const assetPath = await downloadAsset(asset.url, assetName);
    console.log(`Uploading asset: ${assetName}`);
    await uploadAsset(
      octokit,
      toRepoOwner,
      toRepoName,
      newRelease.id,
      assetPath,
      assetName,
    );
  }

  console.log(`Release ${tag} has been copied from ${fromRepo} to ${toRepo}`);
};

const main = async () => {
  program
    .option("--from <repo>", "GitHub repo to copy FROM, e.g. myname/old-repo")
    .option("--to <repo>", "GitHub repo to copy TO, e.g. myfriend/new-repo")
    .option("--release <tag>", "Release tag name to copy, e.g. v1.0.0");
  program.parse();
  const options = program.opts();

  if (process.env.GITHUB_TOKEN == null) {
    throw new Error(
      "GITHUB_TOKEN must be set. Generate a Personal Access Token in your GitHub settings.",
    );
  }
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  await copyRelease(octokit, options.from, options.to, options.release);
};

await main();
