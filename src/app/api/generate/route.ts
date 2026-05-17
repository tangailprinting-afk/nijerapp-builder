import AdmZip from "adm-zip";

import { NextResponse }
from "next/server";

import {

  updateGitHubFile,

  triggerWorkflow,

  uploadBinaryFile,

} from "@/lib/github";

export async function POST(
  req:Request
){

  try{

    const formData =
      await req.formData();

    const appName =
      formData.get(
        "appName"
      ) as string;

    const packageName =
      formData.get(
        "packageName"
      ) as string;

    const htmlCode =
      formData.get(
        "htmlCode"
      ) as string;

    const icon =
      formData.get(
        "icon"
      ) as File;

    const zipFile =
      formData.get(
        "zipFile"
      ) as File;

    if(zipFile){

      const zipBytes =
        await zipFile.arrayBuffer();

      const zip =
        new AdmZip(
          Buffer.from(zipBytes)
        );

      const entries =
        zip.getEntries();

      for(const entry of entries){

        if(entry.isDirectory){

          continue;

        }

        const fileName =
          entry.entryName;

        const fileData =
          entry.getData();

        const base64 =
          fileData.toString(
            "base64"
          );

        await uploadBinaryFile(

          `android-template/WebAppEngine/app/src/main/assets/www/${fileName}`,

          base64,

          `updated ${fileName}`

        );

      }

    }else{

      await updateGitHubFile(

        "android-template/WebAppEngine/app/src/main/assets/www/index.html",

        htmlCode,

        "updated html"

      );

    }

    if(icon){

      const bytes =
        await icon.arrayBuffer();

      const base64 =
        Buffer.from(bytes)
        .toString("base64");

      await uploadBinaryFile(

"android-template/WebAppEngine/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",

        base64,

        "updated icon"

      );

    }

    const strings =
`<resources>
<string name="app_name">${appName}</string>
</resources>`;

    await updateGitHubFile(

"android-template/WebAppEngine/app/src/main/res/values/strings.xml",

      strings,

      "updated strings"

    );

    await triggerWorkflow();

    return NextResponse.json({

      success:true

    });

  }catch(error){

    console.log(error);

    return NextResponse.json({

      success:false

    });

  }

}