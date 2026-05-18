const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
};

export async function getFileSha(
  path: string
) {

  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  return data.sha;
}

export async function updateGitHubFile(
  path: string,
  content: string,
  message: string
) {

  const sha = await getFileSha(path);

  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",

      headers,

      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    }
  );

  return await response.json();
}

export async function uploadBinaryFile(
  path: string,
  base64Content: string,
  message: string
) {

  const sha = await getFileSha(path);

  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",

      headers,

      body: JSON.stringify({
        message,
        content: base64Content,
        sha,
      }),
    }
  );

  return await response.json();
}

export async function triggerWorkflow() {

  const workflowResponse = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/android.yml/dispatches`,
    {
      method: "POST",

      headers,

      body: JSON.stringify({
        ref: "main",
      }),
    }
  );

  console.log(
    "WORKFLOW:",
    workflowResponse.status
  );

  await new Promise((resolve) =>
    setTimeout(resolve, 8000)
  );

  const runsResponse = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs?per_page=1`,
    {
      headers,
      cache: "no-store",
    }
  );

  const runsData =
    await runsResponse.json();

  return runsData.workflow_runs?.[0]?.id;
}

export async function getWorkflowStatus(
  runId: string
) {

  const response =
    await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs/${runId}`,
      {
        headers,
        cache: "no-store",
      }
    );

  return await response.json();
}