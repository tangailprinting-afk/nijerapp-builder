"use client";

import { useState }
from "react";

export default function Home(){

  const [appName,setAppName] =
    useState("");

  const [
    packageName,
    setPackageName
  ] = useState("");

  const [htmlCode,setHtmlCode] =
    useState("");

  const [zipFile,setZipFile] =
    useState<File|null>(null);

  const [icon,setIcon] =
    useState<File|null>(null);

  const [status,setStatus] =
    useState("");
    const [downloadUrl,setDownloadUrl] =
  useState("");

  async function generateAPK(){

    try{

      setStatus(
        "Starting Cloud Build..."
      );

      const formData =
        new FormData();

      formData.append(
        "appName",
        appName
      );

      formData.append(
        "packageName",
        packageName
      );

      formData.append(
        "htmlCode",
        htmlCode
      );

      if(zipFile){

        formData.append(
          "zipFile",
          zipFile
        );

      }

      if(icon){

        formData.append(
          "icon",
          icon
        );

      }

      const response =
        await fetch(

          "/api/generate",

          {
            method:"POST",

            body:formData
          }

        );

      const data =
        await response.json();

      if(data.success){

        setStatus(
          "Cloud Build Started 🚀"
        );

        if(data.runId){

          const interval =
            setInterval(async()=>{

              const statusResponse =
                await fetch(

`/api/status?runId=${data.runId}`

                );

              const statusData =
                await statusResponse.json();

              if(
                statusData.status ===
                "completed"
              ){

                clearInterval(
                  interval
                );

                if(
                  statusData.conclusion ===
                  "success"
                ){

                  setStatus(
                    "APK Build Success ✅"
                  );

const downloadResponse =
  await fetch(
    "/api/download"
  );

const downloadData =
  await downloadResponse.json();

if(downloadData.success){

  setDownloadUrl(
    downloadData.url
  );

}
                  
                }else{

                  setStatus(
                    "APK Build Failed ❌"
                  );

                }

              }

            },5000);

        }

      }else{

        setStatus(
          "Build Failed ❌"
        );

      }

    }catch(error){

      console.log(error);

      setStatus(
        "Server Error ❌"
      );

    }

  }

  return(

    <main className="container">

      <h1>
        NijerApp Builder
      </h1>

      <input

        type="text"

        placeholder="App Name"

        value={appName}

        onChange={(e)=>
          setAppName(
            e.target.value
          )
        }

      />

      <input

        type="text"

        placeholder="Package Name"

        value={packageName}

        onChange={(e)=>
          setPackageName(
            e.target.value
          )
        }

      />

      <textarea

        placeholder="Paste HTML"

        value={htmlCode}

        onChange={(e)=>
          setHtmlCode(
            e.target.value
          )
        }

      />

      <label>

        Upload ZIP

      </label>

      <input

        type="file"

        onChange={(e)=>
          setZipFile(
            e.target.files?.[0]
            || null
          )
        }

      />

      <label>

        Upload Icon

      </label>

      <input

        type="file"

        onChange={(e)=>
          setIcon(
            e.target.files?.[0]
            || null
          )
        }

      />

      <button
        onClick={generateAPK}
      >

        Generate APK

      </button>

      <p>

        {status}

      </p>
      <p>
        In the installed Android app, `window.print()` can be routed to the native printer bridge.
      </p>
{

downloadUrl && (

<a

  href={downloadUrl}

  target="_blank"

>

  <button>

    Download APK

  </button>

</a>

)

}


    </main>

  );

}
