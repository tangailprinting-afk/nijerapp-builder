const fs = require("fs");

const sharp = require("sharp");

const iconPath =
  "android-template/WebAppEngine/icon.txt";

if(!fs.existsSync(iconPath)){

  console.log("No icon.txt");

  process.exit(0);

}

const base64 =
  fs.readFileSync(
    iconPath,
    "utf8"
  );

const buffer =
  Buffer.from(
    base64,
    "base64"
  );

const icons = [

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

async function run(){

  for(const item of icons){

    const output =
      await sharp(buffer)

      .resize(
        item.size,
        item.size
      )

      .png()

      .toBuffer();

    const launcherPath =

"android-template/WebAppEngine/app/src/main/res/" +
item.folder +
"/ic_launcher.png";

    const roundPath =

"android-template/WebAppEngine/app/src/main/res/" +
item.folder +
"/ic_launcher_round.png";

    fs.writeFileSync(
      launcherPath,
      output
    );

    fs.writeFileSync(
      roundPath,
      output
    );

    console.log(
      "Generated:",
      launcherPath
    );

  }

  // FOREGROUND ICON

  // FOREGROUND ICON

  const foregroundOutput =
    await sharp(buffer)

    .resize(512,512)

    .png()

    .toBuffer();

  fs.mkdirSync(

"android-template/WebAppEngine/app/src/main/res/drawable",

  {
    recursive:true
  }

  );

  fs.writeFileSync(

"android-template/WebAppEngine/app/src/main/res/drawable/ic_launcher_foreground.png",

    foregroundOutput

  );

  console.log(
    "Generated foreground icon"
  );

}

run();