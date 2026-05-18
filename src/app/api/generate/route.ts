import AdmZip from "adm-zip";

import { NextResponse }
from "next/server";

import {

  updateGitHubFile,

  triggerWorkflow,

  uploadBinaryFile,

} from "../../../lib/github";

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

    // HTML UPDATE

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

        htmlCode ||

`<h1>Hello NijerApp</h1>`,

        "updated html"

      );

    }

    // ICON UPDATE

    if(icon){

      const bytes =
        await icon.arrayBuffer();

      const base64 =
        Buffer.from(bytes)
        .toString("base64");

const iconPaths = [

"android-template/WebAppEngine/app/src/main/res/mipmap-mdpi/ic_launcher.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-hdpi/ic_launcher.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xhdpi/ic_launcher.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-mdpi/ic_launcher_round.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-hdpi/ic_launcher_round.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png",

"android-template/WebAppEngine/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"

];

      for(const iconPath of iconPaths){

        await uploadBinaryFile(

          iconPath,

          base64,

          "updated icon"

        );

      }

    }

    // APP NAME UPDATE

    const strings =
`<?xml version="1.0" encoding="utf-8"?>
<resources>

<string name="app_name">
${appName}
</string>

</resources>`;

    await updateGitHubFile(

"android-template/WebAppEngine/app/src/main/res/values/strings.xml",

      strings,

      "updated strings"

    );

    // START BUILD

    await triggerWorkflow();

    return NextResponse.json({

      success:true

    });

  }catch(error){

    console.log(error);

    return NextResponse.json({

      success:false,

      error:String(error)

    });

  }

}