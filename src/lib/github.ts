const OWNER =
  process.env.GITHUB_OWNER!;

const REPO =
  process.env.GITHUB_REPO!;

const TOKEN =
  process.env.GITHUB_TOKEN!;

export async function getFileSHA(
  path:string
){

  const response =
    await fetch(

`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,

      {
        headers:{
          Authorization:
`Bearer ${TOKEN}`
        }
      }
    );

  if(response.status === 404){

    return null;

  }

  const data =
    await response.json();

  return data.sha;

}



export async function updateGitHubFile(

  path:string,

  content:string,

  message:string

){

  const sha =
    await getFileSHA(path);

  const response =
    await fetch(

`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,

    {
      method:"PUT",

      headers:{
        Authorization:
`Bearer ${TOKEN}`,

        "Content-Type":
"application/json"
      },

      body:JSON.stringify({

        message,

        content:
Buffer.from(content)
.toString("base64"),

        sha
      })
    }
  );

  const data =
    await response.json();

  console.log(
    "UPDATE FILE:",
    data
  );

}



export async function uploadBinaryFile(

  path:string,

  base64:string,

  message:string

){

  const sha =
    await getFileSHA(path);

  const response =
    await fetch(

`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,

    {
      method:"PUT",

      headers:{
        Authorization:
`Bearer ${TOKEN}`,

        "Content-Type":
"application/json"
      },

      body:JSON.stringify({

        message,

        content:base64,

        sha
      })
    }
  );

  const data =
    await response.json();

  console.log(
    "UPLOAD FILE:",
    data
  );

}





export async function triggerWorkflow(){

  const response =
    await fetch(

`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/android.yml/dispatches`,

      {
        method:"POST",

        headers:{
          Authorization:
`Bearer ${TOKEN}`,

          Accept:
"application/vnd.github+json",

          "Content-Type":
"application/json"
        },

        body:JSON.stringify({
          ref:"main"
        })
      }
    );

  return response.status;

}