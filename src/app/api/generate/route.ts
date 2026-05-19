import AdmZip from "adm-zip";

import sharp from "sharp";

import { NextResponse }
from "next/server";

import {

  updateGitHubFile,

  triggerWorkflow,

  uploadBinaryFile,

  deleteGitHubFile,

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

    // VALIDATE PACKAGE

    const validPackage =
/^[a-z]+\.[a-z0-9]+\.[a-z0-9]+$/;

    if(
      !validPackage.test(
        packageName
      )
    ){

      return NextResponse.json({

        success:false,

        error:"Invalid Package"

      });

    }

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

    // UPDATE ICON

    if(icon){

      const iconBuffer =
        Buffer.from(
          await icon.arrayBuffer()
        );

      const iconSizes = [

        {
          size:48,
          folder:"mipmap-mdpi"
        },

        {
          size:72,
          folder:"mipmap-hdpi"
        },

        {
          size:96,
          folder:"mipmap-xhdpi"
        },

        {
          size:144,
          folder:"mipmap-xxhdpi"
        },

        {
          size:192,
          folder:"mipmap-xxxhdpi"
        }

      ];

      for(
        const item
        of iconSizes
      ){

        await deleteGitHubFile(

`android-template/WebAppEngine/app/src/main/res/${item.folder}/ic_launcher.png`

        );

        await deleteGitHubFile(

`android-template/WebAppEngine/app/src/main/res/${item.folder}/ic_launcher_round.png`

        );

        const resizedIcon =
          await sharp(iconBuffer)

            .resize(
              item.size,
              item.size
            )

            .png()

            .toBuffer();

        const base64 =
          resizedIcon.toString(
            "base64"
          );

        await uploadBinaryFile(

`android-template/WebAppEngine/app/src/main/res/${item.folder}/ic_launcher.png`,

          base64,

          "updated icon"

        );

        await uploadBinaryFile(

`android-template/WebAppEngine/app/src/main/res/${item.folder}/ic_launcher_round.png`,

          base64,

          "updated round icon"

        );

      }

    }

    // PACKAGE UPDATE

    const gradlePath =
"android-template/WebAppEngine/app/build.gradle.kts";

    const gradleResponse =
      await fetch(

`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${gradlePath}`,

        {

          headers:{

            Authorization:
`Bearer ${process.env.GITHUB_TOKEN}`

          },

          cache:"no-store"

        }

      );

    const gradleData =
      await gradleResponse.json();

    const gradleContent =
      Buffer.from(

        gradleData.content,

        "base64"

      ).toString("utf8");

    const updatedGradle =
      gradleContent.replace(

/applicationId\s=\s"[^"]+"/,

`applicationId = "${packageName}"`

      );

    await updateGitHubFile(

      gradlePath,

      updatedGradle,

      "updated package"

    );

    // MANIFEST UPDATE

    const manifestPath =
"android-template/WebAppEngine/app/src/main/AndroidManifest.xml";

    const manifestResponse =
      await fetch(

`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${manifestPath}`,

        {

          headers:{

            Authorization:
`Bearer ${process.env.GITHUB_TOKEN}`

          },

          cache:"no-store"

        }

      );

    const manifestData =
      await manifestResponse.json();

    const manifestContent =
      Buffer.from(

        manifestData.content,

        "base64"

      ).toString("utf8");

    const updatedManifest =
      manifestContent.replace(

/package="[^"]+"/,

`package="${packageName}"`

      );

    await updateGitHubFile(

      manifestPath,

      updatedManifest,

      "updated manifest"

    );

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

    const runId =
      await triggerWorkflow();

    return NextResponse.json({

      success:true,

      runId

    });

  }catch(error){

    console.log(error);

    return NextResponse.json({

      success:false,

      error:String(error)

    });

  }

}