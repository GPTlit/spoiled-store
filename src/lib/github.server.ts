import { createHmac, timingSafeEqual } from "crypto";
import workflow from "./android-workflow.yml?raw";

const GATEWAY = "https://connector-gateway.lovable.dev/github";
export const WORKFLOW_FILE = "spoiled-android.yml";

async function gh(path: string, init: RequestInit = {}) {
  const lk = process.env["LOVABLE_API_KEY"];
  const gk = process.env["GITHUB_API_KEY"];
  if (!lk || !gk) throw new Error("GitHub is not connected");
  const res = await fetch(`${GATEWAY}/${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": gk,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    console.error(`GitHub ${path} [${res.status}]: ${body}`);
    throw new Error(`GitHub error [${res.status}]: ${body.slice(0, 200)}`);
  }
  return res;
}

export function buildToken(appId: string) {
  return createHmac("sha256", process.env["BUILD_CALLBACK_SECRET"]!)
    .update("android:" + appId)
    .digest("hex");
}
export function checkToken(appId: string, token: string) {
  const a = Buffer.from(buildToken(appId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resolves the default branch, ensures the build workflow exists in the repo, then dispatches it. */
export async function dispatchAndroidBuild(
  repo: string,
  branch: string | null,
  inputs: Record<string, string>,
) {
  const info = await gh(`repos/${repo}`);
  if (info.status === 404) throw new Error(`Repository ${repo} not found or not accessible`);
  const ref = branch || (await info.json()).default_branch;

  const path = `repos/${repo}/contents/.github/workflows/${WORKFLOW_FILE}`;
  const existing = await gh(`${path}?ref=${encodeURIComponent(ref)}`);
  let sha: string | undefined;
  let current = "";
  if (existing.status !== 404) {
    const j = await existing.json();
    sha = j.sha;
    current = Buffer.from(j.content ?? "", "base64").toString("utf8");
  }
  if (current !== workflow) {
    await gh(path, {
      method: "PUT",
      body: JSON.stringify({
        message: "Add Spoiled Store Android build",
        content: Buffer.from(workflow).toString("base64"),
        branch: ref,
        ...(sha ? { sha } : {}),
      }),
    });
    // GitHub needs a moment to register a new workflow file.
    await new Promise((r) => setTimeout(r, 4000));
  }

  let last = "";
  for (let i = 0; i < 4; i++) {
    const res = await fetch(
      `${GATEWAY}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
          "X-Connection-Api-Key": process.env["GITHUB_API_KEY"]!,
        },
        body: JSON.stringify({ ref, inputs }),
      },
    );
    if (res.ok)
      return { ref, runsUrl: `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}` };
    last = `[${res.status}] ${await res.text()}`;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Could not start the GitHub build " + last.slice(0, 200));
}
